import { topicsFor, type CropKey, type Mode } from "../knowledge";
import { getNativeBridge } from "./native";
import type { Band, Scan, SeverityResult, SeverityScale } from "./types";

// ---------- SeverityService ----------
/** IRRI SES area scale (0,1,3,5,7,9). Band mapping is a prototype pending agronomist validation. */
export function bandForScore(scale: SeverityScale, score: number): Band {
  if (scale === "irri-ses") return score <= 3 ? "mild" : score <= 5 ? "moderate" : "severe";
  if (scale === "leaf-curl-index") return score <= 1 ? "mild" : score === 2 ? "moderate" : "severe";
  return score <= 10 ? "mild" : score <= 25 ? "moderate" : "severe";
}

export const irriScale = [
  { score: 0, label: "No visible lesions" },
  { score: 1, label: "Less than 1% of leaf area" },
  { score: 3, label: "1–5% of leaf area" },
  { score: 5, label: "6–25% of leaf area" },
  { score: 7, label: "26–50% of leaf area" },
  { score: 9, label: "More than 50% of leaf area" },
];
export const areaBands = [
  { range: "0–10%", band: "mild" as Band },
  { range: "11–25%", band: "moderate" as Band },
  { range: "Over 25%", band: "severe" as Band },
];
export const leafCurlScale = [
  { score: 0, label: "No curling" },
  { score: 1, label: "Slight curling on a few leaves" },
  { score: 2, label: "Curling on many leaves, little stunting" },
  { score: 3, label: "Severe curling and puckering, stunted plant" },
  { score: 4, label: "Severe stunting, little or no flowering" },
];

export function scaleFor(crop: CropKey, slug?: string): SeverityScale {
  if (crop === "rice") return "irri-ses";
  return slug === "leaf-curl" ? "leaf-curl-index" : "area-band";
}

export function severityLabel(s: SeverityResult): string {
  if (s.scale === "irri-ses") return `${s.score} / 9`;
  if (s.scale === "leaf-curl-index") return `${s.score} / 4`;
  return `${s.areaPercent ?? s.score}%`;
}

export function confidenceLevel(confidence: number): "high" | "moderate" | "low" {
  return confidence >= 0.85 ? "high" : confidence >= 0.7 ? "moderate" : "low";
}

// ---------- DiagnosisService ----------
export type DiagnosisDraft = Pick<Scan, "source" | "outcome" | "topicSlug" | "confidence" | "severity">;

export interface DiagnosisService {
  isModelAvailable(crop: CropKey): boolean;
  diagnose(input: { crop: CropKey; mode: Mode; image: string }): Promise<DiagnosisDraft>;
  sample(input: { crop: CropKey; mode: Mode; image: string }): DiagnosisDraft;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += Math.max(1, Math.floor(text.length / 4000))) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic demo data. Every result it returns is marked source: "sample". */
export function sampleDiagnosis(crop: CropKey, mode: Mode, image: string): DiagnosisDraft {
  const options = topicsFor(crop, mode);
  const h = hash(`${crop}:${mode}:${image}`);
  const slot = h % (options.length + 1);
  if (slot === options.length) return { source: "sample", outcome: "unknown", confidence: 0.41 };
  const topic = options[slot];
  const confidence = 0.62 + ((h >>> 8) % 33) / 100;
  const scale = scaleFor(crop, topic.slug);
  let severity: SeverityResult;
  if (scale === "irri-ses") {
    const score = [1, 3, 5, 7][(h >>> 4) % 4];
    severity = { scale, score, max: 9, band: bandForScore(scale, score), areaPercent: [1, 4, 15, 35][(h >>> 4) % 4] };
  } else if (scale === "leaf-curl-index") {
    const score = 1 + ((h >>> 4) % 3);
    severity = { scale, score, max: 4, band: bandForScore(scale, score) };
  } else {
    const pct = [6, 18, 32][(h >>> 4) % 3];
    severity = { scale, score: pct, max: 100, band: bandForScore(scale, pct), areaPercent: pct };
  }
  return { source: "sample", outcome: "identified", topicSlug: topic.slug, confidence: Math.round(confidence * 100) / 100, severity };
}

export const diagnosisService: DiagnosisService = {
  isModelAvailable: () => getNativeBridge() !== null,
  async diagnose({ crop, mode, image }) {
    const bridge = getNativeBridge();
    if (!bridge) throw new Error("model-unavailable");
    const result = await bridge.diagnose({ crop, mode, imageDataUrl: image });
    if (!result.slug || result.confidence < 0.5) return { source: "model", outcome: "unknown", confidence: result.confidence };
    return { source: "model", outcome: "identified", topicSlug: result.slug, confidence: result.confidence, severity: result.severity };
  },
  sample: ({ crop, mode, image }) => sampleDiagnosis(crop, mode, image),
};
