import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bug, ChevronRight, Leaf, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { allConditions, crops } from "../data";
import { cardClass, chipClass, EmptyState, Eyebrow, PageHeader, pageEnter } from "../ui";

const topics = ["All", "Chilli", "Rice", "Diseases", "Pests"] as const;

export function GuidePage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]>("All");

  const results = useMemo(() => allConditions.filter(({ crop, condition }) => {
    const matchesTopic = topic === "All" || crop.name === topic || (topic === "Pests" && condition.category === "Pest") || (topic === "Diseases" && condition.category === "Disease");
    const text = `${crop.name} ${condition.name} ${condition.signs}`.toLowerCase();
    return matchesTopic && text.includes(query.trim().toLowerCase());
  }), [query, topic]);

  return (
    <div className={pageEnter}>
      <PageHeader eyebrow="Saved for the field" title="Know what to look for." description="Plain-language checks for common chilli and rice concerns. For learning — not diagnosis." />

      <section className="grid gap-3 sm:grid-cols-2">
        {crops.map((crop) => (
          <Link key={crop.key} to="/guide/$cropKey" params={{ cropKey: crop.key }} className="group relative block h-44 overflow-hidden rounded-2xl border border-line sm:h-52">
            <img src={crop.image} alt={`${crop.name} field`} loading="lazy" width={1536} height={1024} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="image-scrim absolute inset-0" />
            <div className="on-image absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="on-image-muted font-mono text-[10px] uppercase tracking-wider">{crop.conditions.length} guides · {crop.stages.length} stages</span>
                <strong className="block text-2xl font-semibold">{crop.name}</strong>
                <span className="on-image-muted text-sm">{crop.subtitle}</span>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background/85 text-foreground backdrop-blur"><ArrowUpRight className="size-4" /></span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <Eyebrow>All symptoms</Eyebrow>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Search the guide</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symptoms, e.g. “spots” or “curl”" aria-label="Search crop guide" className="h-12 rounded-xl pl-10 text-base" />
          </label>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter guide">
            {topics.map((item) => <button key={item} type="button" data-selected={topic === item} onClick={() => setTopic(item)} className={chipClass}>{item}</button>)}
          </div>
        </div>

        {results.length ? (
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {results.map(({ crop, condition }) => (
              <Link key={`${crop.key}-${condition.slug}`} to="/guide/$cropKey/$conditionSlug" params={{ cropKey: crop.key, conditionSlug: condition.slug }} className={cn(cardClass, "group flex items-start gap-3 p-4 transition-colors hover:border-primary/40")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", condition.category === "Pest" ? "bg-amber/10 text-amber" : "bg-primary/10 text-primary")}>
                  {condition.category === "Pest" ? <Bug className="size-[18px]" /> : <Leaf className="size-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{crop.name} · {condition.category}</span>
                  <strong className="block text-[15px] font-semibold">{condition.name}</strong>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{condition.signs}</span>
                </span>
                <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4"><EmptyState icon={<Search className="size-5" />} title="No guide found" text="Try another symptom or crop." action={<Button variant="outline" onClick={() => { setQuery(""); setTopic("All"); }}>Clear search</Button>} /></div>
        )}
      </section>
    </div>
  );
}
