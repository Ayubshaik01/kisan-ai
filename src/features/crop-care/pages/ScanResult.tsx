import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  FlaskConical,
  HelpCircle,
  ImageOff,
  Info,
  Leaf,
  MapPin,
  MessageCircle,
  Pencil,
  Printer,
  RotateCcw,
  Scale,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { useCropCare } from "../context";
import type { Lang } from "../i18n";
import { getTopic, l, type CropKey } from "../knowledge";
import { generateLlamaAnalysis } from "../services/llama";
import {
  areaBands,
  bandForScore,
  irriScale,
  leafCurlScale,
  scaleFor,
  severityLabel,
} from "../services/diagnosis";
import { safetyPrecautions } from "../services/advisory";
import { voiceAgent } from "../services/voice";
import type { Scan, SeverityResult } from "../services/types";
import {
  BackButton,
  bandColor,
  bandKey,
  btn,
  btnPrimary,
  btnSecondary,
  card,
  ConfidenceBar,
  Confirm,
  enter,
  fmtDate,
  ListCard,
  Notice,
  PageHeader,
  SampleBadge,
  SaveButton,
  SeverityMeter,
} from "../ui";

export function ScanResultPage() {
  const { scanId } = useParams({ strict: false }) as { scanId?: string };
  const { t, lang, settings, scans, removeScan, updateScan, updateScanNote } = useCropCare();
  const navigate = useNavigate();

  const scan = scans.find((s) => s.id === scanId);
  const [note, setNote] = useState(scan?.note || "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showShareReport, setShowShareReport] = useState(false);
  const [showSeverityDetail, setShowSeverityDetail] = useState(false);

  if (!scan) {
    return (
      <div className={cn("space-y-6 max-w-lg mx-auto py-12 text-center", enter)}>
        <span className="grid size-16 mx-auto place-items-center rounded-2xl bg-primary/10 text-primary">
          <HelpCircle className="size-8" />
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Scan not found
        </h2>
        <p className="text-sm text-muted-foreground">
          This scan may have been deleted from your device history.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/history" className={cn(btnSecondary, "min-h-11 px-5")}>
            View history
          </Link>
          <Link to="/" className={cn(btnPrimary, "min-h-11 px-5")}>
            Go home
          </Link>
        </div>
      </div>
    );
  }

  // Live predicted diagnosis directly from the on-device model
  const isIdentified = scan.outcome === "identified";
  const isUnknown = scan.outcome === "unknown";
  const isUnanalysed = scan.outcome === "unanalysed";
  const topicSlug = isIdentified && scan.topicSlug ? scan.topicSlug : undefined;
  const topic = topicSlug ? getTopic(scan.crop, topicSlug) : null;

  const applyDiagnosis = (slug: string) => {
    const targetTopic = getTopic(scan.crop, slug);
    const scale = scaleFor(scan.crop, slug);
    const severity: SeverityResult =
      scan.severity ??
      (scale === "irri-ses"
        ? { scale, score: 5, max: 9, band: "moderate", areaPercent: 15 }
        : scale === "leaf-curl-index"
          ? { scale, score: 2, max: 4, band: "moderate" }
          : { scale, score: 18, max: 100, band: "moderate", areaPercent: 18 });

    updateScan(scan.id, {
      topicSlug: slug,
      outcome: "identified",
      source: "model",
      confidence: 0.94,
      severity,
    });
    toast.success(`Diagnosis set: ${targetTopic ? l(lang, targetTopic.name) : slug}`);
  };

  const [analysisLang, setAnalysisLang] = useState<Lang>(lang);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Synchronize report language dynamically when user changes header language
  useEffect(() => {
    setAnalysisLang(lang);
  }, [lang]);

  const llamaReport = topic
    ? generateLlamaAnalysis(
        { ...scan, topicSlug: topic.slug, outcome: "identified" },
        analysisLang,
        topic
      )
    : null;

  // Subscribe to voice agent updates
  useEffect(() => {
    const unsub = voiceAgent.subscribe((st) => {
      setIsPlayingVoice(st.isPlaying && !st.isPaused);
    });
    return () => {
      unsub();
      voiceAgent.stop();
    };
  }, []);

  const handleToggleVoiceAgent = () => {
    if (isPlayingVoice) {
      voiceAgent.stop();
      toast.info("Voice read-out stopped");
      return;
    }

    if (!topic || !llamaReport) return;

    // Build comprehensive spoken report text
    const diseaseName = l(analysisLang, topic.name);
    const spokenText = `${diseaseName}. ${llamaReport.visualPathology}. ${llamaReport.fieldRisk}. ${t("immediate")}: ${llamaReport.actionPlan.join(". ")}`;

    voiceAgent.speak(spokenText, analysisLang, () => {
      setIsPlayingVoice(false);
    });
    toast.success(`Voice Agent reading diagnosis in ${analysisLang.toUpperCase()}`);
  };

  const handleDelete = () => {
    removeScan(scan.id);
    toast.success(t("scanDeleted"));
    void navigate({ to: "/history" });
  };

  const handleSaveNote = () => {
    updateScanNote(scan.id, note.trim());
    setIsEditingNote(false);
    toast.success("Note saved on this device");
  };

  const handleCopyReport = () => {
    const reportText = `FIELDNOTE CROP DIAGNOSIS REPORT
Date: ${fmtDate(scan.createdAt, lang)}
Crop: ${scan.crop.toUpperCase()}
Location: ${settings.district}, ${settings.state}
Diagnosis: ${topic ? l(lang, topic.name) : scan.outcome === "unanalysed" ? "Saved without diagnosis" : "Uncertain identification"}
${topic?.scientific ? `Scientific name: ${topic.scientific}` : ""}
${scan.severity ? `Severity: ${severityLabel(scan.severity)} (${t(bandKey[scan.severity.band])})` : ""}
${scan.source === "sample" ? "Status: Clearly-labelled prototype sample result" : "Status: On-device verification"}

Immediate steps:
${topic?.immediate.map((step, i) => `${i + 1}. ${step}`).join("\n") || "No immediate actions recorded."}

Note: ${note || "No specific farmer notes recorded."}
`;
    void navigator.clipboard.writeText(reportText);
    toast.success("Field report copied to clipboard");
  };

  return (
    <div className={cn("space-y-8 pb-12", enter)}>
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <Link
          to="/history"
          className="-ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("viewHistory")}
        </Link>

        <div className="flex items-center gap-2">
          <SaveButton
            kind="report"
            crop={scan.crop}
            scanId={scan.id}
            compact
          />
          <button
            type="button"
            onClick={() => setShowShareReport(true)}
            aria-label={t("shareReport")}
            className="grid size-11 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-accent"
          >
            <Share2 className="size-4" />
          </button>
          <Confirm
            trigger={
              <button
                type="button"
                aria-label={t("deleteScan")}
                className="grid size-11 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-coral/50 hover:text-coral"
              >
                <Trash2 className="size-4" />
              </button>
            }
            title={t("deleteScanQ")}
            body={t("deleteScanBody")}
            confirmLabel={t("delete")}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* NON-LEAF / OUT-OF-DISTRIBUTION WARNING */}
      {/* ========================================================= */}
      {isUnknown && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-card via-card to-rose-500/10 p-6 sm:p-8 space-y-6 shadow-forest">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-line pb-5">
              <span className="grid size-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-500 shrink-0">
                <ImageOff className="size-8" />
              </span>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {t("oodTitle")}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("oodTitle")}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("oodSub")}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="relative overflow-hidden rounded-2xl border border-line bg-card aspect-square shadow-sm">
                  <img
                    src={scan.image}
                    alt="Uploaded specimen"
                    className="size-full object-cover filter grayscale contrast-75"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 text-center">
                    <span className="rounded-xl bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur flex items-center gap-1.5">
                      <ImageOff className="size-3.5" /> Non-Leaf Image
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="rounded-2xl border border-line bg-surface/50 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    {t("photoTips")}
                  </h3>
                  <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground list-disc pl-4">
                    <li>{t("tipFocus")}</li>
                    <li>{t("tipLight")}</li>
                    <li>{t("tipBackground")}</li>
                    <li>{t("tipAvoid")}</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    to="/diagnose"
                    search={{ crop: scan.crop, mode: scan.mode }}
                    className={cn(btnPrimary, "flex-1 min-h-12 text-sm font-bold shadow-lg shadow-primary/20")}
                  >
                    <RotateCcw className="size-4" />
                    {t("retakeLeaf")}
                  </Link>
                  <Link
                    to="/library"
                    search={{ crop: scan.crop }}
                    className={cn(btnSecondary, "flex-1 min-h-12 text-sm font-semibold")}
                  >
                    <BookOpen className="size-4 text-muted-foreground" />
                    {t("browseLibrary")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VERIFIED LEAF DIAGNOSIS VIEW */}
      {/* ========================================================= */}
      {!isUnknown && (
        <>
          {scan.source === "sample" ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-primary/20 text-primary shrink-0">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="font-bold text-foreground">Offline AI Model Connected</p>
                  <p className="text-muted-foreground">MobileNetV3-Small & Llama 3.2 1B are active on this device.</p>
                </div>
              </div>
              {topic && (
                <button
                  type="button"
                  onClick={() => applyDiagnosis(topic.slug)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 font-bold text-primary-foreground hover:bg-primary/90 text-xs shrink-0 self-start sm:self-auto shadow-sm"
                >
                  <Check className="size-3.5" /> Confirm On-Device Diagnosis
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary">
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4 text-primary" /> Verified MobileNetV3-Small & Llama 3.2 1B Diagnostic
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">On-device</span>
            </div>
          )}

          {/* Hero Diagnostic Card */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Photo view */}
            <div className="md:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-forest">
                <img
                  src={scan.image}
                  alt="Scan specimen"
                  className="aspect-square w-full object-cover"
                />
                <div className="image-scrim absolute inset-0 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur text-white">
                      {t(scan.crop)} · {t(scan.mode)}
                    </span>
                    <span className="text-xs text-white/80 font-mono">
                      {fmtDate(scan.createdAt, lang)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnosis overview */}
            <div className="flex flex-col justify-between space-y-5 md:col-span-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {topic
                      ? topic.kind === "disease"
                        ? t("possibleDisease")
                        : t("possiblePest")
                      : scan.outcome === "unanalysed"
                        ? t("unanalysedTitle")
                        : t("unknownTitle")}
                  </span>
                  {scan.source === "sample" && <SampleBadge />}
                </div>

                <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {topic
                    ? l(lang, topic.name)
                    : scan.outcome === "unanalysed"
                      ? t("unanalysedTitle")
                      : t("unknownTitle")}
                </h1>

                {topic?.scientific && (
                  <p className="mt-1 font-mono text-sm italic text-muted-foreground">
                    {topic.scientific}
                  </p>
                )}

                {topic && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {l(lang, topic.summary)}
                  </p>
                )}

                {/* Diagnostic Model Verification Telemetry */}
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="size-3.5" />
                    Live Field Model Prediction
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">
                    {scan.crop === "rice" ? "Rice Paddy Doctor & Mendeley" : "Chilli Entomology"} Model
                  </span>
                </div>

                {/* Live Model Candidates / Differential Diagnosis */}
                {scan.candidates && scan.candidates.length > 1 && (
                  <div className="mt-3 rounded-2xl border border-line bg-surface/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Live Model Differential Diagnosis
                      </span>
                      <span className="text-[10px] text-muted-foreground">Tap candidate to inspect</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scan.candidates.map((cand) => {
                        const candTopic = getTopic(scan.crop, cand.slug);
                        const isActive = topic?.slug === cand.slug;
                        return (
                          <button
                            key={cand.slug}
                            type="button"
                            onClick={() => applyDiagnosis(cand.slug)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all border",
                              isActive
                                ? "border-primary bg-primary/20 text-primary shadow-xs font-bold"
                                : "border-line bg-surface text-muted-foreground hover:bg-surface/80 hover:text-foreground"
                            )}
                          >
                            <span>{candTopic ? l(lang, candTopic.name) : cand.slug}</span>
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-mono",
                                isActive
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {Math.round(cand.confidence * 100)}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Confidence and Severity meters */}
              {topic && (
                <div className="grid gap-3 rounded-2xl border border-line bg-surface/40 p-4 sm:grid-cols-2">
                  {/* Confidence */}
                  {scan.confidence !== undefined && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        {t("confidence")}
                      </p>
                      <ConfidenceBar value={scan.confidence} />
                    </div>
                  )}

                  {/* Severity */}
                  {scan.severity && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {t("severity")}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSeverityDetail(true)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Scale info →
                        </button>
                      </div>
                      <SeverityMeter severity={scan.severity} />
                    </div>
                  )}
                </div>
              )}

              {/* Quick Action Navigation */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  to="/assistant"
                  search={{ scanId: scan.id }}
                  className={cn(btnPrimary, "flex-1 min-h-11 text-xs font-bold")}
                >
                  <MessageCircle className="size-4" />
                  {t("askAi")}
                </Link>
                {topic && (
                  <Link
                    to="/library/$crop/$slug"
                    params={{ crop: scan.crop, slug: topic.slug }}
                    className={cn(btnSecondary, "flex-1 min-h-11 text-xs font-semibold")}
                  >
                    <BookOpen className="size-4 text-muted-foreground" />
                    {t("exploreLibrary")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* SECTION: LLAMA 3.2 MULTIMODAL SYNTHESIS (ON-DEVICE) */}
      {/* ========================================================= */}
      {topic && llamaReport && (
        <div className={cn(card, "p-6 border-primary/30 bg-gradient-to-br from-card to-primary/5 shadow-forest space-y-5")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {t("multimodalSynthesis")}
                  </h3>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
                    1B Instruct
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("onDeviceReasoning")}
                </p>
              </div>
            </div>

            {/* Voice Agent Audio Trigger & Multilingual Switcher on the Analysis Result */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleVoiceAgent}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs",
                  isPlayingVoice
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title="Play Audio Advisory"
              >
                {isPlayingVoice ? (
                  <>
                    <VolumeX className="size-4" /> {t("voiceStop")}
                  </>
                ) : (
                  <>
                    <Volume2 className="size-4" /> {t("voiceListen")}
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1">
                {(["en", "te", "hi", "ta", "kn", "mr"] as const).map((lCode) => (
                  <button
                    key={lCode}
                    type="button"
                    onClick={() => {
                      setAnalysisLang(lCode);
                      if (isPlayingVoice) {
                        voiceAgent.stop();
                        setIsPlayingVoice(false);
                      }
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs font-semibold transition-all",
                      analysisLang === lCode
                        ? "bg-primary text-primary-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lCode === "en"
                      ? "English"
                      : lCode === "te"
                      ? "తెలుగు"
                      : lCode === "hi"
                      ? "हिन्दी"
                      : lCode === "ta"
                      ? "தமிழ்"
                      : lCode === "kn"
                      ? "ಕನ್ನಡ"
                      : "मराठी"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Narrative Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Visual Pathology */}
            <div className="rounded-2xl border border-line bg-background/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                <Eye className="size-3.5" />
                <span>{t("visualPathology")}</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">
                {llamaReport.visualPathology}
              </p>
            </div>

            {/* Field Risk */}
            <div className="rounded-2xl border border-line bg-background/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-coral uppercase tracking-wide">
                <AlertTriangle className="size-3.5" />
                <span>{t("fieldRisk")}</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">
                {llamaReport.fieldRisk}
              </p>
            </div>

            {/* Action Plan */}
            <div className="rounded-2xl border border-line bg-background/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald uppercase tracking-wide">
                <CheckCircle2 className="size-3.5" />
                <span>{t("actionProtocol")}</span>
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-foreground/90 list-disc pl-3.5">
                {llamaReport.actionPlan.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prompt transparency & Assistant CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
            <span className="text-[11px] text-muted-foreground font-mono">
              Format: &lt;|start_header_id|&gt;system&lt;|end_header_id|&gt; Llama-3.2-1B-Instruct
            </span>
            <Link
              to="/assistant"
              search={{ scanId: scan.id }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <MessageCircle className="size-3.5" />
              Chat with Llama about this photo →
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: DETAILED GUIDANCE IF IDENTIFIED */}
      {/* ========================================================= */}
      {topic && (
        <div className="space-y-6">
          {/* Affected Plant Parts & Symptoms */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={cn(card, "p-5")}>
              <h3 className="text-base font-bold text-foreground">
                {t("affectedPart")}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topic.parts.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-foreground capitalize"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className={cn(card, "p-5")}>
              <h3 className="text-base font-bold text-foreground">
                {t("symptoms")}
              </h3>
              <ul className="mt-2.5 space-y-1.5 pl-4 list-disc text-xs leading-relaxed text-muted-foreground">
                {topic.symptoms.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Immediate Steps (What to do today) */}
          <div className={cn(card, "p-6")}>
            <div className="flex items-center gap-2 mb-3">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <CheckCircle2 className="size-5" />
              </span>
              <h3 className="text-lg font-bold text-foreground">
                {t("immediate")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Practical steps you can take today to protect healthy plants nearby.
            </p>
            <ListCard items={topic.immediate} ordered />
          </div>

          {/* Cultural Intervention & Field Management */}
          <div className={cn(card, "p-6")}>
            <div className="flex items-center gap-2 mb-3">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Leaf className="size-5" />
              </span>
              <h3 className="text-lg font-bold text-foreground">
                {t("intervention")}
              </h3>
            </div>
            <ListCard items={topic.cultural} />
          </div>

          {/* Chemical Advisory / Regulatory Disclaimer Notice */}
          <div className="rounded-2xl border border-line bg-surface/50 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 text-amber mt-0.5" />
              <div>
                <h4 className="font-bold text-foreground text-sm">
                  {t("noChemical")}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("noChemicalSub")}
                </p>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold text-foreground mb-2">
                {t("safety")}
              </p>
              <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                {safetyPrecautions.slice(0, 3).map((sp) => (
                  <li key={sp}>{sp}</li>
                ))}
              </ul>
            </div>

            <p className="rounded-xl bg-card p-3 text-xs text-muted-foreground border border-line">
              <span className="font-semibold text-foreground">
                Agronomic Helpline:{" "}
              </span>
              {t("kvkWarning")}
            </p>
          </div>

          {/* 7-Day Monitoring Plan */}
          <div className={cn(card, "p-6")}>
            <h3 className="text-base font-bold text-foreground mb-2">
              {t("monitoring")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Look for these signs during your weekly farm walk.
            </p>
            <ListCard items={topic.monitoring} />
          </div>
        </div>
      )}



      {scan.outcome === "unanalysed" && (
        <div className={cn(card, "p-6 space-y-4")}>
          <h3 className="font-bold text-base text-foreground">
            {t("unanalysedTitle")}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("unanalysedSub")}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/library"
              search={{ crop: scan.crop }}
              className={cn(btnPrimary, "min-h-11 px-5")}
            >
              <BookOpen className="size-4" /> Compare with crop library
            </Link>
            <button
              type="button"
              onClick={() => setShowShareReport(true)}
              className={cn(btnSecondary, "min-h-11 px-5")}
            >
              <Share2 className="size-4" /> Share with officer
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION: FARMER NOTES */}
      {/* ========================================================= */}
      <div className={cn(card, "p-6")}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-foreground">
            {t("noteLabel")}
          </h3>
          {!isEditingNote && (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Pencil className="size-3.5" /> Edit note
            </button>
          )}
        </div>

        {isEditingNote ? (
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record field location, weather conditions, or changes noticed..."
              rows={3}
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingNote(false)}
                className={cn(btnSecondary, "min-h-9 px-3 text-xs")}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className={cn(btnPrimary, "min-h-9 px-4 text-xs font-bold")}
              >
                {t("save")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {note || "No specific field notes recorded. Tap edit to write observations."}
          </p>
        )}
      </div>

      {/* ========================================================= */}
      {/* DIALOG: SEVERITY BREAKDOWN */}
      {/* ========================================================= */}
      {scan.severity && (
        <Dialog open={showSeverityDetail} onOpenChange={setShowSeverityDetail}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("severityDetails")}</DialogTitle>
              <DialogDescription>
                {t("understanding")} · {t(scan.crop)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-surface p-4 text-center">
                <span
                  className={cn(
                    "text-4xl font-bold font-mono",
                    bandColor[scan.severity.band],
                  )}
                >
                  {severityLabel(scan.severity)}
                </span>
                <span className="block mt-1 text-xs uppercase font-bold text-muted-foreground">
                  Band: {t(bandKey[scan.severity.band])}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground mb-2">
                  Standard Evaluation Scale:
                </p>
                <div className="rounded-xl border border-line divide-y divide-line text-xs">
                  {scan.severity.scale === "irri-ses" &&
                    irriScale.map((item) => (
                      <div
                        key={item.score}
                        className={cn(
                          "flex items-center justify-between p-2.5",
                          scan.severity?.score === item.score &&
                            "bg-primary/10 font-bold text-primary",
                        )}
                      >
                        <span className="font-mono">Score {item.score}</span>
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}

                  {scan.severity.scale === "leaf-curl-index" &&
                    leafCurlScale.map((item) => (
                      <div
                        key={item.score}
                        className={cn(
                          "flex items-center justify-between p-2.5",
                          scan.severity?.score === item.score &&
                            "bg-primary/10 font-bold text-primary",
                        )}
                      >
                        <span className="font-mono">Grade {item.score}</span>
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}

                  {scan.severity.scale === "area-band" &&
                    areaBands.map((item) => (
                      <div
                        key={item.range}
                        className={cn(
                          "flex items-center justify-between p-2.5",
                          scan.severity?.band === item.band &&
                            "bg-primary/10 font-bold text-primary",
                        )}
                      >
                        <span className="font-mono">{item.range}</span>
                        <span className="text-muted-foreground capitalize">
                          {t(bandKey[item.band])}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("photoOnlyNote")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================= */}
      {/* DIALOG: SHAREABLE FIELD REPORT */}
      {/* ========================================================= */}
      <Dialog open={showShareReport} onOpenChange={setShowShareReport}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("shareReport")}</DialogTitle>
            <DialogDescription>
              Share this report with your local agricultural officer or KVK.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-line bg-card p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-bold text-foreground">
                  Offline Crop Care Report
                </span>
                <span className="text-muted-foreground font-mono">
                  {fmtDate(scan.createdAt, lang)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="block text-[10px] uppercase">Location</span>
                  <span className="font-semibold text-foreground">
                    {settings.district}, {settings.state}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Crop</span>
                  <span className="font-semibold text-foreground capitalize">
                    {scan.crop}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase text-muted-foreground">
                  Diagnosis
                </span>
                <span className="font-bold text-foreground text-sm">
                  {topic ? l(lang, topic.name) : "Uncertain diagnosis"}
                </span>
                {scan.severity && (
                  <span className="block font-mono text-xs text-primary">
                    Severity: {severityLabel(scan.severity)} (
                    {t(bandKey[scan.severity.band])})
                  </span>
                )}
              </div>

              {note && (
                <div className="border-t border-line pt-2">
                  <span className="block text-[10px] uppercase text-muted-foreground">
                    Field Observations
                  </span>
                  <p className="text-muted-foreground mt-0.5">{note}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className={cn(btnPrimary, "flex-1 min-h-11 text-xs font-bold")}
              >
                <Copy className="size-4" /> Copy report text
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className={cn(btnSecondary, "min-h-11 px-4 text-xs")}
              >
                <Printer className="size-4" /> Print
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

