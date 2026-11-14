import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/library/")({
  head: () => ({ meta: pageMeta("Crop knowledge", "Crop knowledge in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Crop knowledge" />,
});
