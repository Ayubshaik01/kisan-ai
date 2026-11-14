import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/scans/$scanId")({
  head: () => ({ meta: pageMeta("Scan result", "Scan result in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Scan result" />,
});
