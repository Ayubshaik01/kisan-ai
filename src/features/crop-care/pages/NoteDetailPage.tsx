import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Cpu, FileImage, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops } from "../data";
import { backLinkClass, cardClass, EmptyState, Eyebrow, pageEnter, StatusPill } from "../ui";

export function NoteDetailPage({ noteId }: { noteId: string }) {
  const { scans, ready, removeScan } = useCropCare();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const scan = scans.find((item) => item.id === noteId);
  const crop = crops.find((item) => item.key === scan?.crop);
  const back = <Link to="/notes" className={backLinkClass}><ArrowLeft className="size-4" /> Field notes</Link>;

  if (!ready) return <div className={cn(cardClass, "h-80 animate-pulse")} />;
  if (!scan) {
    return (
      <div className={pageEnter}>
        <div className="mb-4">{back}</div>
        <EmptyState icon={<FileImage className="size-5" />} title="This note isn’t on this device" text="It may have been removed, or saved on another phone or browser." action={<Button asChild variant="outline"><Link to="/notes">See all notes</Link></Button>} />
      </div>
    );
  }

  return (
    <div className={pageEnter}>
      <div className="mb-3">{back}</div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-card">
            <img src={scan.image} alt={`${crop?.name ?? "Crop"} photo saved as a private field note`} className="max-h-[70vh] w-full object-contain" />
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-background/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider backdrop-blur"><FileImage className="size-3.5" /> Stored locally</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Eyebrow>{crop?.name} · photo note</Eyebrow>
              <StatusPill>Not analyzed</StatusPill>
            </div>
            <h1 className="mt-2 text-balance text-2xl font-semibold leading-snug sm:text-3xl">{scan.note || "Crop photo saved"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Saved {new Date(scan.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>

          <div className={cn(cardClass, "flex gap-3 p-4")}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted-foreground"><Cpu className="size-[18px]" /></span>
            <div>
              <Eyebrow className="text-amber">No model installed</Eyebrow>
              <h2 className="mt-1 font-semibold">This photo hasn’t been analyzed.</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">This version saves photos and offers crop guidance, but has no disease-detection or severity model.</p>
            </div>
          </div>

          <div className={cn(cardClass, "p-4 sm:p-5")}>
            <Eyebrow>A careful next step</Eyebrow>
            <h2 className="mt-1 text-lg font-semibold">Look at more than one leaf.</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Check a few nearby plants, note when the change first appeared, and compare with the crop guide. Get local expert advice before treating.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {crop && <Button asChild variant="outline" className="h-11 rounded-xl"><Link to="/guide/$cropKey" params={{ cropKey: crop.key }}><BookOpen /> {crop.name} guide</Link></Button>}
              <Button asChild className="h-11 rounded-xl"><Link to="/ask"><MessageCircle /> Ask what to check <ArrowRight /></Link></Button>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> No pesticide names, dosages or treatments are generated from this photo.</p>

          <div className="border-t border-line pt-4">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm">Delete this note?</span>
                <Button variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
                <Button variant="destructive" onClick={() => { removeScan(scan.id); void navigate({ to: "/notes" }); }}>Delete</Button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-10 items-center gap-2 text-sm text-coral hover:underline"><Trash2 className="size-4" /> Delete this note</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
