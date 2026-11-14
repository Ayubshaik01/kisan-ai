import { Link } from "@tanstack/react-router";
import { ChevronRight, Clock3, FileImage } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { crops } from "./data";
import type { LocalScan } from "./storage";

export const pageEnter = "animate-in fade-in slide-in-from-bottom-2 duration-300";
export const backLinkClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-md pr-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground";
export const chipClass =
  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-muted-foreground transition-colors hover:text-foreground data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary";
export const cardClass = "rounded-2xl border border-line bg-card";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, description, back, aside }: { eyebrow: string; title: string; description?: ReactNode; back?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      {back && <div className="-ml-0.5 mb-3">{back}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-2 text-balance text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        </div>
        {aside}
      </div>
      {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
    </header>
  );
}

export function StatusPill({ tone = "amber", children }: { tone?: "amber" | "green" | "muted"; children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", tone === "amber" ? "bg-amber" : tone === "green" ? "bg-primary" : "bg-muted-foreground")} />
      {children}
    </span>
  );
}

export function IconBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary", className)}>{children}</span>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className={cn(cardClass, "flex flex-col items-center px-6 py-10 text-center")}>
      <IconBadge className="size-12 rounded-full">{icon}</IconBadge>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ScanRow({ scan }: { scan: LocalScan }) {
  const crop = crops.find((item) => item.key === scan.crop);
  const date = new Date(scan.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: scan.id }}
      className="group flex min-h-[76px] items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60 sm:gap-4 sm:px-3"
    >
      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-muted">
        <img src={scan.image} alt="" loading="lazy" className="size-full object-cover" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{crop?.name ?? "Crop"} · photo note</span>
        <strong className="truncate text-[15px] font-medium">{scan.note || "Crop photo saved"}</strong>
        <small className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" /> {date}</small>
      </span>
      <span className="hidden sm:inline-flex"><StatusPill>Not analyzed</StatusPill></span>
      <FileImage className="size-4 shrink-0 text-amber sm:hidden" aria-label="Not analyzed" />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
