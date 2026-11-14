import { topics } from "../knowledge";
import { getNativeBridge } from "./native";
import type { ModelStatusItem } from "./types";

/** LocalModelStatusService: never invents model state — the web preview reports what it can actually run. */
export async function getModelStatus(): Promise<ModelStatusItem[]> {
  const bridge = getNativeBridge();
  if (bridge) {
    try {
      return await bridge.status();
    } catch {
      return [{ id: "runtime", label: "On-device runtime", detail: "The Android runtime reported an error.", state: "error" }];
    }
  }
  return [
    { id: "vision-rice", label: "Rice vision model", detail: "MobileNetV3-Small · ships with the Android app", state: "unavailable" },
    { id: "vision-chilli", label: "Chilli vision model", detail: "MobileNetV3-Small · ships with the Android app", state: "unavailable" },
    { id: "llm", label: "Assistant language model", detail: "Llama 3.2 1B Instruct, 4-bit · ships with the Android app", state: "unavailable" },
    { id: "database", label: "Knowledge database", detail: `${topics.length} crop topics built into this app`, state: "installed", version: "0.2 (prototype)" },
    { id: "runtime", label: "On-device runtime", detail: "ExecuTorch + XNNPACK is not available in a web browser", state: "unavailable" },
  ];
}
