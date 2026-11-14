import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { SettingsPage } from "@/features/crop-care/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: pageMeta("Settings", "Choose your language and appearance, see what works on this device, and manage your saved notes.") }),
  component: SettingsPage,
});
