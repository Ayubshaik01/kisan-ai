import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/crop-care/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fieldnote — Crop care, close at hand" },
      { name: "description", content: "A private, offline-ready crop care companion with photo notes, chilli and rice guides, and careful next steps." },
      { property: "og:title", content: "Fieldnote — Crop care, close at hand" },
      { property: "og:description", content: "Crop notes and practical field guidance, kept on your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});
