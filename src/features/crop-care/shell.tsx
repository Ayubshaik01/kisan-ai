import { Link } from "@tanstack/react-router";
import { BookOpen, Camera, ChevronDown, CircleHelp, Home, Leaf, MessageCircle, NotebookPen, Settings2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { languageNames, languages, languageShort, useCropCare, type Language } from "./context";

const primaryNav = [
  { to: "/", label: "Home", short: "Home", icon: Home, exact: true },
  { to: "/check", label: "Crop check", short: "Check", icon: Camera, exact: false },
  { to: "/ask", label: "Ask Fieldnote", short: "Ask", icon: MessageCircle, exact: false },
  { to: "/notes", label: "Field notes", short: "Notes", icon: NotebookPen, exact: false },
  { to: "/guide", label: "Crop guide", short: "Guide", icon: BookOpen, exact: false },
] as const;

const secondaryNav = [
  { to: "/settings", label: "Settings", icon: Settings2 },
  { to: "/about", label: "About & help", icon: CircleHelp },
] as const;

const sideLink =
  "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:font-medium data-[status=active]:text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useCropCare();

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <a href="#main" className="visually-hidden focus:not-sr-only">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:h-16">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Fieldnote home">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Leaf className="size-[18px]" strokeWidth={1.8} /></span>
            <span className="truncate text-lg font-semibold tracking-tight">fieldnote<span className="text-primary">.</span></span>
          </Link>
          <span className="ml-auto hidden items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:flex">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/15" /> Works offline
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-4">
            <label className="relative flex h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm text-muted-foreground hover:text-foreground">
              <span className="font-medium">{languageShort[language]}</span>
              <ChevronDown className="size-3.5" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                aria-label="Language"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {languages.map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}
              </select>
            </label>
            <Link
              to="/settings"
              aria-label="Settings"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:text-primary lg:hidden"
            >
              <Settings2 className="size-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] flex-col border-r border-line px-3 py-6 lg:flex">
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {primaryNav.map(({ to, label, icon: Icon, exact }) => (
              <Link key={to} to={to} activeOptions={{ exact }} className={sideLink}>
                <Icon className="size-[18px]" strokeWidth={1.8} /> {label}
              </Link>
            ))}
          </nav>
          <p className="mb-2 mt-7 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">More</p>
          <nav className="flex flex-col gap-0.5" aria-label="More">
            {secondaryNav.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={sideLink}>
                <Icon className="size-[18px]" strokeWidth={1.8} /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex items-start gap-2.5 border-t border-line px-3 pt-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /> Your photos and notes stay on this device.
          </div>
        </aside>

        <main id="main" className="min-w-0 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16 xl:px-14">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 px-1.5 pt-1.5 pb-1">
          {primaryNav.map(({ to, short, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-primary/15">
                <Icon className="size-5" strokeWidth={1.9} />
              </span>
              {short}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
