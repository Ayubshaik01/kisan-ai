import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { PlaceholderPage } from "@/features/crop-care/pages/Placeholder";

export const Route = createFileRoute("/profile/offline")({
  head: () => ({ meta: pageMeta("Offline and models", "Offline and models in the offline crop assistant.") }),
  component: () => <PlaceholderPage title="Offline and models" />,
});
