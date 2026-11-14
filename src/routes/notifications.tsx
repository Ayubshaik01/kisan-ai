import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: pageMeta("Notifications", "Notifications in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Notifications" />,
});
