import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bug, Camera, ChevronRight, Eye, Leaf, MessageCircle, Phone, Search, ShieldCheck, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CropCondition, CropGuide } from "../data";
import { backLinkClass, cardClass, Eyebrow, pageEnter } from "../ui";

export function ConditionPage({ crop, condition }: { crop: CropGuide; condition: CropCondition }) {
  const others = crop.conditions.filter((item) => item.slug !== condition.slug);
  const isPest = condition.category === "Pest";

  return (
    <div className={pageEnter}>
      <Link to="/guide/$cropKey" params={{ cropKey: crop.key }} className={cn(backLinkClass, "mb-3")}><ArrowLeft className="size-4" /> {crop.name} guide</Link>

      <header className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
        <div className="min-w-0">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider", isPest ? "bg-amber/10 text-amber" : "bg-primary/10 text-primary")}>
            {isPest ? <Bug className="size-3.5" /> : <Leaf className="size-3.5" />} {crop.name} · {condition.category}
          </span>
          <h1 className="mt-3 text-balance text-[32px] font-semibold leading-tight tracking-tight sm:text-5xl">{condition.name}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{condition.signs}</p>
        </div>
        <img src={crop.image} alt={`${crop.name} field`} className="hidden h-40 w-full rounded-2xl border border-line object-cover md:block" />
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
        <div className="space-y-4">
          <section className={cn(cardClass, "p-5")}>
            <div className="flex items-center gap-2"><Eye className="size-4 text-primary" /><Eyebrow>Look closely at</Eyebrow></div>
            <ul className="mt-3 space-y-2.5">
              {condition.lookAt.map((item, index) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed"><span className="font-mono text-xs leading-6 text-primary">0{index + 1}</span> {item}</li>
              ))}
            </ul>
          </section>
          <section className={cn(cardClass, "p-5")}>
            <div className="flex items-center gap-2"><Search className="size-4 text-primary" /><Eyebrow>A first field check</Eyebrow></div>
            <p className="mt-3 text-[15px] leading-relaxed">{condition.firstStep}</p>
          </section>
          <section className={cn(cardClass, "p-5")}>
            <div className="flex items-center gap-2"><Shuffle className="size-4 text-amber" /><Eyebrow>Can look similar to</Eyebrow></div>
            <p className="mt-3 text-[15px] leading-relaxed">{condition.similarTo}</p>
          </section>
          <section className="rounded-2xl border border-amber/30 bg-amber/5 p-5">
            <div className="flex items-center gap-2"><Phone className="size-4 text-amber" /><Eyebrow className="text-amber">When to get local help</Eyebrow></div>
            <p className="mt-3 text-[15px] leading-relaxed">{condition.getHelp}</p>
          </section>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> A photo or description cannot confirm a diagnosis. No chemical recommendations are given here — follow verified local advice.</p>
        </div>

        <aside className="space-y-4">
          <div className={cn(cardClass, "space-y-2 p-5")}>
            <h2 className="font-semibold">Keep a record</h2>
            <p className="text-sm text-muted-foreground">A dated photo helps you and an adviser see if it’s spreading.</p>
            <Button asChild className="h-11 w-full rounded-xl"><Link to="/check"><Camera /> Save a photo note <ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl"><Link to="/ask"><MessageCircle /> Ask a follow-up</Link></Button>
          </div>
          {others.length > 0 && (
            <div>
              <Eyebrow className="mb-2">Also in {crop.name}</Eyebrow>
              <div className="space-y-2">
                {others.map((item) => (
                  <Link key={item.slug} to="/guide/$cropKey/$conditionSlug" params={{ cropKey: crop.key, conditionSlug: item.slug }} className={cn(cardClass, "flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:border-primary/40")}>
                    {item.category === "Pest" ? <Bug className="size-4 text-amber" /> : <Leaf className="size-4 text-primary" />}
                    <span className="flex-1 text-[15px] font-medium">{item.name}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
