import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: pageMeta("Saved advisories", "Saved advisories in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Saved advisories" />,
});
