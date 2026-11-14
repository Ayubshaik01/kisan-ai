import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: pageMeta("Help and FAQ", "Help and FAQ in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Help and FAQ" />,
});
