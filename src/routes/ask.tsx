import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { AskPage } from "@/features/crop-care/pages/AskPage";

export const Route = createFileRoute("/ask")({
  head: () => ({ meta: pageMeta("Ask Fieldnote", "Ask about chilli and rice symptoms and get careful, offline field guidance in English, Telugu or Hindi.") }),
  component: AskPage,
});
