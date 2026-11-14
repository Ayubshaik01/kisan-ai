import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { CheckPage } from "@/features/crop-care/pages/CheckPage";

export const Route = createFileRoute("/check")({
  head: () => ({ meta: pageMeta("Crop check", "Save a private crop photo and field observation on your device, ready to compare and share with an adviser.") }),
  component: CheckPage,
});
