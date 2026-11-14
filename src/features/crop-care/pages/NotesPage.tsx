import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, NotebookPen, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops } from "../data";
import { cardClass, chipClass, EmptyState, PageHeader, pageEnter, ScanRow } from "../ui";

const filters = ["All", "Chilli", "Rice"] as const;

export function NotesPage() {
  const { scans, ready } = useCropCare();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const visible = useMemo(() => scans.filter((scan) => {
    const cropName = crops.find((item) => item.key === scan.crop)?.name ?? "";
    const matchesCrop = filter === "All" || cropName === filter;
    return matchesCrop && `${cropName} ${scan.note}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [filter, query, scans]);

  return (
    <div className={pageEnter}>
      <PageHeader
        eyebrow="Private on this device"
        title="Your field notes."
        description="Keep crop photos and observations together as the season unfolds."
        aside={
          <div className="text-right">
            <strong className="block font-mono text-3xl font-medium leading-none sm:text-4xl">{ready ? scans.length.toString().padStart(2, "0") : "--"}</strong>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Notes</span>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notes" aria-label="Search notes" className="h-12 rounded-xl pl-10 text-base" />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter notes">
          {filters.map((item) => <button key={item} type="button" data-selected={filter === item} onClick={() => setFilter(item)} className={chipClass}>{item}</button>)}
        </div>
      </div>

      {!ready ? (
        <div className={cn(cardClass, "h-40 animate-pulse")} />
      ) : visible.length ? (
        <div className={cn(cardClass, "divide-y divide-line p-1.5")}>{visible.map((scan) => <ScanRow key={scan.id} scan={scan} />)}</div>
      ) : scans.length ? (
        <EmptyState icon={<Search className="size-5" />} title="No notes match that search" text="Try another crop or phrase." action={<Button variant="outline" onClick={() => { setQuery(""); setFilter("All"); }}>Clear search</Button>} />
      ) : (
        <EmptyState
          icon={<NotebookPen className="size-5" />}
          title="Your season starts with one note"
          text="Save a photo and a field observation. It stays on your device."
          action={<Button asChild className="h-11 rounded-xl"><Link to="/check"><Camera /> Start a crop check <ArrowRight /></Link></Button>}
        />
      )}

      <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" /> Stored in this browser only · up to 30 notes
      </p>
    </div>
  );
}
