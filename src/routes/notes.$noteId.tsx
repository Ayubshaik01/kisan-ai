import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/features/crop-care/meta";
import { NoteDetailPage } from "@/features/crop-care/pages/NoteDetailPage";

export const Route = createFileRoute("/notes/$noteId")({
  head: () => ({ meta: [...pageMeta("Photo note", "A private crop photo note saved on this device."), { name: "robots", content: "noindex" }] }),
  component: NoteRoute,
});

function NoteRoute() {
  const { noteId } = Route.useParams();
  return <NoteDetailPage noteId={noteId} />;
}
