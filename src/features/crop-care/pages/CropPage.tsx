import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bug, Camera, CheckCircle2, ChevronRight, Leaf, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CropGuide } from "../data";
import { backLinkClass, cardClass, Eyebrow, pageEnter } from "../ui";

export function CropPage({ crop }: { crop: CropGuide }) {
  return (
    <div className={cn(pageEnter, "space-y-10")}>
      <div>
        <Link to="/guide" className={cn(backLinkClass, "mb-3")}><ArrowLeft className="size-4" /> Crop guide</Link>
        <section className="relative h-64 overflow-hidden rounded-2xl border border-line sm:h-80">
          <img src={crop.image} alt={`${crop.name} crop growing in the field`} width={1536} height={1024} className="absolute inset-0 size-full object-cover" />
          <div className="image-scrim absolute inset-0" />
          <div className="on-image absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7">
            <span className="on-image-muted font-mono text-[11px] uppercase tracking-[0.14em]">Crop notes</span>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{crop.name}</h1>
            <p className="on-image-muted mt-1 text-[15px]">{crop.subtitle}</p>
          </div>
        </section>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{crop.about}</p>
      </div>

      <section>
        <Eyebrow>Season at a glance</Eyebrow>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">What to watch at each stage</h2>
        <ol className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {crop.stages.map((stage, index) => (
            <li key={stage.name} className={cn(cardClass, "w-[72%] shrink-0 snap-start p-4 sm:w-[44%] lg:w-auto")}>
              <span className="font-mono text-xs text-primary">0{index + 1}</span>
              <strong className="mt-2 block font-semibold">{stage.name}</strong>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.watch}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
        <section>
          <Eyebrow>Common concerns</Eyebrow>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Symptoms to know</h2>
          <div className="mt-4 space-y-2.5">
            {crop.conditions.map((condition) => (
              <Link key={condition.slug} to="/guide/$cropKey/$conditionSlug" params={{ cropKey: crop.key, conditionSlug: condition.slug }} className={cn(cardClass, "group flex items-start gap-3 p-4 transition-colors hover:border-primary/40")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", condition.category === "Pest" ? "bg-amber/10 text-amber" : "bg-primary/10 text-primary")}>
                  {condition.category === "Pest" ? <Bug className="size-[18px]" /> : <Leaf className="size-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{condition.category}</span>
                  <strong className="block text-[15px] font-semibold">{condition.name}</strong>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{condition.signs}</span>
                </span>
                <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-3">
          <div className={cn(cardClass, "p-5")}>
            <Eyebrow>Weekly field walk</Eyebrow>
            <h2 className="mt-1 text-lg font-semibold">Five minutes, once a week</h2>
            <ul className="mt-3 space-y-3">
              {crop.weeklyChecks.map((check) => (
                <li key={check} className="flex gap-2.5 text-sm leading-relaxed"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {check}</li>
              ))}
            </ul>
          </div>
          <div className={cn(cardClass, "space-y-2 p-5")}>
            <h2 className="font-semibold">Seen something?</h2>
            <p className="text-sm text-muted-foreground">Keep a dated photo note so you can see whether it changes.</p>
            <Button asChild className="h-11 w-full rounded-xl"><Link to="/check"><Camera /> Save a {crop.name.toLowerCase()} photo <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl"><Link to="/ask"><MessageCircle /> Ask a question</Link></Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
