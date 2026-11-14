import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/diagnose/")({
  head: () => ({ meta: pageMeta("Diagnose", "Diagnose in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Diagnose" />,
});
