import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BookOpen, Camera, CloudOff, Cpu, Leaf, Lightbulb, MessageCircle, NotebookPen, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops, fieldTips } from "../data";
import { cardClass, Eyebrow, IconBadge, pageEnter, ScanRow, StatusPill } from "../ui";

const quickActions = [
  { to: "/check", title: "Crop check", text: "Save a photo note", icon: Camera },
  { to: "/ask", title: "Ask", text: "Get field guidance", icon: MessageCircle },
  { to: "/notes", title: "Field notes", text: "Your saved records", icon: NotebookPen },
  { to: "/guide", title: "Crop guide", text: "What to look for", icon: BookOpen },
] as const;

export function HomePage() {
  const { scans, ready, storageIssue } = useCropCare();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    setTipIndex(day % fieldTips.length);
  }, []);
  const tip = fieldTips[tipIndex];

  return (
    <div className={cn(pageEnter, "space-y-10 sm:space-y-12")}>
      <section className={cn(cardClass, "overflow-hidden shadow-forest md:grid md:grid-cols-[1.05fr_1fr]")}>
        <div className="relative h-48 sm:h-64 md:order-2 md:h-auto md:min-h-[360px]">
          <img src={crops[0]?.image} alt="Healthy chilli plants growing in a field" width={1536} height={1024} className="absolute inset-0 size-full object-cover" />
          <div className="image-scrim absolute inset-0" />
          <p className="on-image absolute inset-x-4 bottom-3 flex items-center gap-2 text-xs sm:text-sm">
            <span className="grid size-6 place-items-center rounded-full border border-current/30"><Leaf className="size-3" /></span>
            Small observations make a difference
          </p>
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-8 md:p-10">
          <StatusPill tone="green">Your field companion</StatusPill>
          <h1 className="mt-4 text-balance text-[30px] font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-[44px]">
            Better field notes.<br className="hidden sm:block" /> Healthier harvests.
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Keep crop photos, learn what to look for, and find a careful next step — even with no signal.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 rounded-xl px-5 text-[15px] font-semibold">
              <Link to="/check"><Camera /> Start a crop check <ArrowRight /></Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-xl px-4 text-[15px] text-muted-foreground">
              <Link to="/ask"><MessageCircle /> Ask a question</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> Private by default</span>
            <span className="flex items-center gap-1.5"><WifiOff className="size-3.5 text-primary" /> Works offline</span>
          </div>
        </div>
      </section>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map(({ to, title, text, icon: Icon }) => (
          <Link key={to} to={to} className={cn(cardClass, "group flex min-h-[120px] flex-col justify-between p-4 transition-colors hover:border-primary/40 sm:p-5")}>
            <div className="flex items-start justify-between">
              <IconBadge><Icon className="size-[18px]" /></IconBadge>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="mt-4">
              <strong className="block text-[15px] font-semibold">{title}</strong>
              <span className="text-[13px] text-muted-foreground">{text}</span>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionHeading eyebrow="Your crops" title="What’s growing?" link={<Link to="/guide" className="inline-flex min-h-10 items-center gap-1 text-sm text-primary">All guides <ArrowRight className="size-4" /></Link>} />
            <div className="grid gap-3 sm:grid-cols-2">
              {crops.map((crop) => (
                <Link key={crop.key} to="/guide/$cropKey" params={{ cropKey: crop.key }} className={cn(cardClass, "group overflow-hidden transition-colors hover:border-primary/40")}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={crop.image} alt={`${crop.name} crop in the field`} loading="lazy" width={1536} height={1024} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-background/80 backdrop-blur"><ArrowUpRight className="size-4" /></span>
                  </div>
                  <div className="p-4">
                    <Eyebrow>{crop.conditions.length} field guides</Eyebrow>
                    <strong className="mt-1 block text-lg font-semibold">{crop.name}</strong>
                    <span className="text-sm text-muted-foreground">{crop.subtitle}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="Recent notes" title="From the field" link={scans.length > 0 ? <Link to="/notes" className="inline-flex min-h-10 items-center gap-1 text-sm text-primary">All notes <ArrowRight className="size-4" /></Link> : null} />
            {ready && scans.length > 0 ? (
              <div className={cn(cardClass, "divide-y divide-line p-1.5")}>{scans.slice(0, 3).map((scan) => <ScanRow key={scan.id} scan={scan} />)}</div>
            ) : (
              <Link to="/check" className={cn(cardClass, "group flex items-center gap-4 p-4 transition-colors hover:border-primary/40")}>
                <IconBadge className="rounded-full"><Leaf className="size-[18px]" /></IconBadge>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[15px] font-semibold">Your field notes start here</strong>
                  <span className="text-sm text-muted-foreground">Save a crop photo and a short note to track what you see.</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          {tip && (
            <div className={cn(cardClass, "border-amber/30 p-5")}>
              <div className="flex items-center gap-2 text-amber"><Lightbulb className="size-4" /><Eyebrow className="text-amber">Today’s field check · {tip.crop}</Eyebrow></div>
              <p className="mt-3 text-[15px] leading-relaxed">{tip.tip}</p>
            </div>
          )}
          <div className={cn(cardClass, "p-5")}>
            <div className="flex items-center justify-between">
              <IconBadge><CloudOff className="size-[18px]" /></IconBadge>
              <StatusPill tone="green">Offline ready</StatusPill>
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-snug">Field notes stay close to home.</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Guides and saved photos live on this device. No account or connection needed.</p>
          </div>
          <Link to="/about" className={cn(cardClass, "flex items-center gap-3 p-4 transition-colors hover:border-primary/40")}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted-foreground"><Cpu className="size-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">Photo check status</strong>
              <span className="text-[13px] text-muted-foreground">No disease-detection model installed</span>
            </span>
            <span className="size-2 shrink-0 rounded-full bg-amber" />
          </Link>
          {storageIssue && <p className="px-1 text-sm text-amber">Device storage couldn’t be read. Your crop guides still work.</p>}
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, link }: { eyebrow: string; title: string; link?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {link}
    </div>
  );
}
