import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { NotesPage } from "@/features/crop-care/pages/NotesPage";

export const Route = createFileRoute("/notes/")({
  head: () => ({ meta: pageMeta("Field notes", "Your saved crop photos and observations, stored privately on this device.") }),
  component: NotesPage,
});
