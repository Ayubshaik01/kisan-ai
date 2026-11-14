import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleHelp, Cpu, Download, FileImage, Languages, Leaf, MessageCircle, Moon, Search, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { languageNames, languages, useCropCare, type Language } from "../context";
import { cardClass, IconBadge, PageHeader, pageEnter, StatusPill } from "../ui";

export function SettingsPage() {
  const { language, setLanguage, theme, setTheme, scans, storageIssue, clearAll, canInstall, install } = useCropCare();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className={cn(pageEnter, "mx-auto max-w-3xl")}>
      <PageHeader eyebrow="Your device, your choice" title="Settings." description="Set Fieldnote up the way you like. Preferences stay in this browser." />

      <div className="space-y-4">
        <Section icon={<Languages className="size-[18px]" />} title="Language & appearance" text="How Fieldnote looks and speaks.">
          <Row title="Language" text="Used for suggested questions">
            <select aria-label="Choose app language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="h-11 rounded-xl border border-input bg-background px-3 text-[15px]">
              {languages.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}
            </select>
          </Row>
          <Row title="Appearance" text="Comfortable in any light">
            <div className="grid grid-cols-2 rounded-xl border border-line p-1" role="group" aria-label="Appearance">
              {(["dark", "light"] as const).map((choice) => (
                <button key={choice} type="button" data-selected={theme === choice} onClick={() => setTheme(choice)} className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground">
                  {choice === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />} {choice === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section icon={<Cpu className="size-[18px]" />} title="On-device tools" text="What works on this device today.">
          <Tool icon={<Search className="size-4" />} title="Crop photo identification" text="No model installed" status={<StatusPill>Unavailable</StatusPill>} />
          <Tool icon={<Leaf className="size-4" />} title="Crop knowledge guide" text="Chilli & rice field checks" status={<StatusPill tone="green">On device</StatusPill>} />
          <Tool icon={<MessageCircle className="size-4" />} title="Local guidance replies" text="Common field questions" status={<StatusPill tone="green">On device</StatusPill>} />
        </Section>

        <Section icon={<ShieldCheck className="size-[18px]" />} title="Privacy & storage" text="Your photos stay in this browser.">
          <div className="flex items-center gap-3 py-3">
            <span className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground"><FileImage className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <strong className="block text-[15px] font-medium">{scans.length} {scans.length === 1 ? "photo note" : "photo notes"}</strong>
              <span className="text-sm text-muted-foreground">{scans.length ? "Saved locally · up to 30" : "Nothing saved yet"}</span>
            </div>
            <Link to="/notes" className="inline-flex min-h-10 items-center gap-1 text-sm text-primary">View <ArrowRight className="size-4" /></Link>
          </div>
          {storageIssue && <p className="text-sm text-coral">Local storage is unavailable. Existing notes may not be readable.</p>}
          {confirmClear ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-coral/30 bg-coral/5 p-3">
              <span className="mr-auto text-sm">Remove all {scans.length} saved notes?</span>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>Keep</Button>
              <Button variant="destructive" onClick={() => { clearAll(); setConfirmClear(false); }}>Remove all</Button>
            </div>
          ) : (
            <button type="button" disabled={scans.length === 0} onClick={() => setConfirmClear(true)} className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm text-coral disabled:opacity-40">
              <Trash2 className="size-4" /> Clear saved photos and notes
            </button>
          )}
        </Section>

        <Section icon={<Leaf className="size-[18px]" />} title="App" text="Install and learn more.">
          {canInstall ? (
            <Button variant="outline" className="my-2 h-11 w-full rounded-xl" onClick={() => void install()}><Download /> Add to your home screen</Button>
          ) : (
            <p className="py-2 text-sm leading-relaxed text-muted-foreground">To install, open your browser menu and choose “Add to Home screen” once the app is published.</p>
          )}
          <Link to="/about" className="flex min-h-12 items-center gap-3 border-t border-line pt-3 text-[15px]">
            <CircleHelp className="size-4 text-primary" /> <span className="flex-1">About, privacy & questions</span> <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <section className={cn(cardClass, "p-4 sm:p-6")}>
      <div className="mb-2 flex items-center gap-3">
        <IconBadge>{icon}</IconBadge>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div><strong className="block text-[15px] font-medium">{title}</strong><span className="text-sm text-muted-foreground">{text}</span></div>
      {children}
    </div>
  );
}

function Tool({ icon, title, text, status }: { icon: ReactNode; title: string; text: string; status: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1"><strong className="block text-[15px] font-medium">{title}</strong><span className="text-sm text-muted-foreground">{text}</span></div>
      {status}
    </div>
  );
}
