import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { GuidePage } from "@/features/crop-care/pages/GuidePage";

export const Route = createFileRoute("/guide/")({
  head: () => ({ meta: pageMeta("Crop guide", "Plain-language guides to common chilli and rice diseases and pests — what to look for and what to check first.") }),
  component: GuidePage,
});
