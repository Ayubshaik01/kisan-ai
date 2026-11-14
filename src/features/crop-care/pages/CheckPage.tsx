import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Camera, Check, CircleHelp, Clock3, FileImage, ImageUp, Leaf, ShieldCheck, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops, type CropKey } from "../data";
import { compressPhoto, type LocalScan } from "../storage";
import { cardClass, Eyebrow, PageHeader, pageEnter } from "../ui";

const photoTips = ["Show one affected leaf clearly", "Use even, natural light", "Take photos from a few plants"];

export function CheckPage() {
  const { addScan } = useCropCare();
  const navigate = useNavigate();
  const [crop, setCrop] = useState<CropKey>("chilli");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file to keep a crop photo.");
      return;
    }
    try {
      setPhoto(await compressPhoto(file));
      setPhotoName(file.name);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "This photo could not be opened.");
    }
  }

  function discard() {
    setPhoto(null);
    setPhotoName("");
    setError("");
  }

  function save() {
    if (!photo) return;
    const scan: LocalScan = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
      crop,
      createdAt: new Date().toISOString(),
      image: photo,
      note: note.trim(),
      severity: "Not assessed",
      status: "not-analyzed",
    };
    if (!addScan(scan)) {
      setError("Device storage is full or unavailable. The photo was not saved.");
      return;
    }
    void navigate({ to: "/notes/$noteId", params: { noteId: scan.id } });
  }

  return (
    <div className={pageEnter}>
      <PageHeader
        eyebrow="A private photo note"
        title="Take a closer look."
        description="Save a crop photo and what you noticed. This version keeps records — it does not identify disease or judge severity."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5">
        <section className={cn(cardClass, "p-3 sm:p-4")}>
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <Eyebrow><span className="text-primary">01</span> · Crop photo</Eyebrow>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /> Stays on device</span>
          </div>
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-line bg-canvas">
            {photo ? (
              <>
                <img src={photo} alt="Selected crop photo" className="absolute inset-0 size-full object-contain" />
                <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-line bg-background/90 px-2.5 py-1.5 text-xs"><Check className="size-3.5 text-primary" /> Ready to save</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <span className="grid size-14 place-items-center rounded-full border border-line bg-card text-primary"><FileImage className="size-6" strokeWidth={1.5} /></span>
                <strong className="mt-1 text-base font-semibold">Bring a leaf into view</strong>
                <span className="max-w-xs text-sm text-muted-foreground">Keep the affected area sharp and in good natural light.</span>
              </div>
            )}
            <span aria-hidden className="pointer-events-none absolute inset-[12%] rounded-lg border border-primary/30" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="h-12 rounded-xl text-[15px]" onClick={() => cameraRef.current?.click()}><Camera /> Camera</Button>
            <Button className="h-12 rounded-xl text-[15px] font-semibold" onClick={() => fileRef.current?.click()}><ImageUp /> Choose photo</Button>
          </div>
          <input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={handlePhoto} aria-label="Choose a crop photo" />
          <input ref={cameraRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handlePhoto} aria-label="Take a crop photo" />
          {photoName && <p className="mt-2.5 flex items-center gap-1.5 px-1 text-sm text-muted-foreground"><Check className="size-3.5 text-primary" /> <span className="truncate">{photoName}</span></p>}
          {error && <p className="mt-2.5 px-1 text-sm text-coral" role="alert">{error}</p>}
        </section>

        <section className={cn(cardClass, "p-4 sm:p-6")}>
          <Eyebrow><span className="text-primary">02</span> · Add a little context</Eyebrow>
          <h2 className="mt-1.5 text-xl font-semibold">What are we looking at?</h2>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">Crop</legend>
            <div className="grid grid-cols-2 gap-2">
              {crops.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCrop(item.key)}
                  data-selected={crop === item.key}
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 text-[15px] text-muted-foreground transition-colors data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
                >
                  <Leaf className="size-4 text-primary" /> {item.name}
                  {crop === item.key && <Check className="ml-auto size-4 text-primary" />}
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor="crop-note" className="mb-2 mt-5 flex items-center justify-between text-sm font-medium">
            Your observation <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>
          </label>
          <textarea
            id="crop-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Where did you notice it? What looks different?"
            maxLength={240}
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-base leading-relaxed placeholder:text-muted-foreground"
          />
          <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{note.length}/240</p>

          <div className="mt-3 flex gap-3 rounded-xl border border-amber/25 bg-amber/5 p-3.5">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber" />
            <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">A note, not a diagnosis.</strong> No disease model is installed. Don’t use a saved photo alone to make treatment decisions.</p>
          </div>

          {photo ? (
            <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
              <Button variant="ghost" className="h-12 rounded-xl text-muted-foreground" onClick={discard}><X /> Discard</Button>
              <Button className="h-12 rounded-xl text-[15px] font-semibold" onClick={save}><Check /> Save private note</Button>
            </div>
          ) : (
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" /> Add a photo to save your note.</p>
          )}
        </section>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {photoTips.map((tip, index) => (
          <div key={tip} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
            <span className="font-mono text-xs text-primary">0{index + 1}</span>
            <span className="text-sm">{tip}</span>
          </div>
        ))}
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not sure what to photograph? <Link to="/guide" className="inline-flex items-center gap-1 text-primary"><BookOpen className="size-3.5" /> Browse the crop guide</Link>
      </p>
    </div>
  );
}
