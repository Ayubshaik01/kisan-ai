import type { CropKey, Mode } from "../knowledge";
import type { ModelStatusItem, SeverityResult } from "./types";

/**
 * Contract the Kotlin app can expose on `window.CropAssistantNative` (e.g. via a WebView JS interface).
 * When it is absent, the services fall back to honest web-preview behaviour.
 */
export type NativeBridge = {
  diagnose(input: { crop: CropKey; mode: Mode; imageDataUrl: string }): Promise<{ slug: string | null; confidence: number; severity?: SeverityResult }>;
  ask?(input: { question: string; context: string; lang: string }): Promise<string>;
  status(): Promise<ModelStatusItem[]>;
};

export function getNativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { CropAssistantNative?: NativeBridge }).CropAssistantNative ?? null;
}
