import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { AboutPage } from "@/features/crop-care/pages/AboutPage";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: pageMeta("About & help", "How Fieldnote works, what it can and can’t do, and answers to common questions about privacy and offline use.") }),
  component: AboutPage,
});
