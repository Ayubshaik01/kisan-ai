import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: pageMeta("Scan history", "Scan history in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Scan history" />,
});
