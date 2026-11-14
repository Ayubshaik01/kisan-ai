import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/library/$crop/$slug")({
  head: () => ({ meta: pageMeta("Crop topic", "Crop topic in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Crop topic" />,
});
