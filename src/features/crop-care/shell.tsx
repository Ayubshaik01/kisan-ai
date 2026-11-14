import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, BookOpen, Bookmark, CircleHelp, History, Home, Leaf, MessageCircle, ScanLine, ShieldCheck, UserRound, WifiOff } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "./context";
import { langs, type Lang } from "./i18n";

export function Logo({ compact }: { compact?: boolean }) {
  const { t } = useCropCare();
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={t("appName")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-leaf-deep text-primary-foreground shadow-[0_6px_20px_-8px] shadow-primary"><Leaf className="size-5" strokeWidth={2.2} /></span>
      {!compact && <span className="truncate text-[15px] font-bold leading-tight tracking-tight">{t("appShort")}<span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Offline AI</span></span>}
    </Link>
  );
}

export function LangSwitch() {
  const { settings, updateSettings } = useCropCare();
  return (
    <label className="relative flex h-10 items-center rounded-xl border border-line bg-card px-3 text-sm font-semibold">
      {langs.find((x) => x.code === settings.lang)?.short}
      <select value={settings.lang} onChange={(e) => updateSettings({ lang: e.target.value as Lang })} aria-label="Language" className="absolute inset-0 cursor-pointer opacity-0">
        {langs.map((x) => <option key={x.code} value={x.code}>{x.native}</option>)}
      </select>
    </label>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, ready, settings, online, reminders } = useCropCare();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bare = pathname.startsWith("/welcome") || /^\/diagnose\/[^/]+\/[^/]+/.test(pathname) || pathname.endsWith("/report");

  useEffect(() => {
    if (ready && !settings.onboarded && !pathname.startsWith("/welcome")) void navigate({ to: "/welcome" });
  }, [ready, settings.onboarded, pathname, navigate]);

  const nav = [
    { to: "/", label: t("navHome"), icon: Home, exact: true },
    { to: "/library", label: t("navKnowledge"), icon: BookOpen, exact: false },
    { to: "/diagnose", label: t("navDiagnose"), icon: ScanLine, exact: false, primary: true },
    { to: "/history", label: t("navHistory"), icon: History, exact: false },
    { to: "/profile", label: t("navProfile"), icon: UserRound, exact: false },
  ] as const;
  const more = [
    { to: "/assistant", label: t("navAssistant"), icon: MessageCircle },
    { to: "/saved", label: t("navSaved"), icon: Bookmark },
    { to: "/notifications", label: t("navNotifications"), icon: Bell },
    { to: "/help", label: t("navHelp"), icon: CircleHelp },
  ] as const;
  const due = reminders.filter((r) => !r.done && r.dueDate <= new Date().toISOString().slice(0, 10)).length;

  if (bare) return <div className="min-h-dvh bg-canvas text-foreground">{children}</div>;

  const side = "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:text-primary";

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <a href="#main" className="visually-hidden focus:not-sr-only">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-1.5">
            <Link to="/profile/offline" className="hidden h-10 items-center gap-2 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-muted-foreground sm:flex">
              {online ? <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/20" /> : <WifiOff className="size-3.5 text-amber" />}
              {online ? t("offlineReady") : t("offlineNow").split(".")[0]}
            </Link>
            <LangSwitch />
            <Link to="/notifications" aria-label={t("navNotifications")} className="relative grid size-10 place-items-center rounded-xl border border-line bg-card text-muted-foreground hover:text-foreground">
              <Bell className="size-[18px]" />
              {due > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{due}</span>}
            </Link>
          </div>
        </div>
        {!online && <p className="border-t border-amber/30 bg-amber/10 px-4 py-2 text-center text-sm font-medium text-amber">{t("offlineNow")}</p>}
      </header>

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] flex-col gap-1 border-r border-line px-3 py-6 lg:flex">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <Link key={to} to={to} activeOptions={{ exact }} className={side}><Icon className="size-[18px]" />{label}</Link>
          ))}
          <div className="my-3 border-t border-line" />
          {more.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={side}><Icon className="size-[18px]" />{label}</Link>
          ))}
          <div className="mt-auto flex gap-2.5 rounded-xl bg-card p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" />{t("obOff3")}</div>
        </aside>
        <main id="main" className="min-w-0 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-10 lg:pb-16">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end px-2 pb-1.5 pt-1">
          {nav.map((item) => {
            const Icon = item.icon;
            if ("primary" in item) {
              return (
                <Link key={item.to} to={item.to} className="group flex flex-col items-center gap-1 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary">
                  <span className="-mt-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_28px_-10px] shadow-primary ring-4 ring-canvas transition-transform group-active:scale-95"><Icon className="size-6" /></span>
                  {item.label}
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to} activeOptions={{ exact: item.exact }} className="group flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary">
                <span className="grid h-7 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-primary/15"><Icon className="size-5" /></span>
                <span className={cn("max-w-full truncate px-0.5")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
