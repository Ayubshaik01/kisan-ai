import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { translate, type Key, type Lang } from "./i18n";
import type { CropKey } from "./knowledge";
import { registerCropCareAppShell } from "./pwa";
import { assistantReply, type AssistantContext } from "./services/advisory";
import { getNativeBridge } from "./services/native";
import { chatStore, clearUserData, defaultSettings, eventService, historyService, newId, recentService, reminderService, savedService, settingsService } from "./services/store";
import type { ChatMessage, LocalEvent, Reminder, SavedItem, SavedKind, Scan, Settings } from "./services/types";

type SaveKey = { slug?: string; scanId?: string; crop: CropKey };
type State = {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  t: (key: Key) => string;
  lang: Lang;
  online: boolean;
  scans: Scan[];
  addScan: (scan: Scan) => boolean;
  removeScan: (id: string) => void;
  saved: SavedItem[];
  isSaved: (kind: SavedKind, key: SaveKey) => boolean;
  toggleSaved: (kind: SavedKind, key: SaveKey) => boolean;
  removeSaved: (id: string) => void;
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "done">) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  events: LocalEvent[];
  pushEvent: (e: Omit<LocalEvent, "id" | "at">) => void;
  recent: string[];
  visitTopic: (crop: CropKey, slug: string) => void;
  messages: ChatMessage[];
  typing: boolean;
  ask: (text: string, ctx: AssistantContext) => void;
  clearChat: () => void;
  clearData: (scope: "history" | "saved" | "chat" | "all") => void;
};

const Ctx = createContext<State | null>(null);
const same = (i: SavedItem, kind: SavedKind, k: SaveKey) => i.kind === kind && i.crop === k.crop && i.slug === k.slug && i.scanId === k.scanId;

export function CropCareProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [scans, setScans] = useState<Scan[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSettings(settingsService.load());
    setScans(historyService.list());
    setSaved(savedService.list());
    setReminders(reminderService.list());
    setEvents(eventService.list());
    setRecent(recentService.list());
    setMessages(chatStore.list<ChatMessage>());
    setOnline(navigator.onLine);
    setReady(true);
    void registerCropCareAppShell();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.lang;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => { root.dataset["theme"] = settings.theme === "system" ? (mq.matches ? "light" : "dark") : settings.theme; };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [settings.theme, settings.lang]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((c) => { const n = { ...c, ...patch }; settingsService.save(n); return n; });
  }, []);

  const pushEvent = useCallback((e: Omit<LocalEvent, "id" | "at">) => {
    setEvents((c) => { const n = [{ ...e, id: newId(), at: new Date().toISOString() }, ...c]; eventService.save(n); return n; });
  }, []);

  const addScan = useCallback((scan: Scan) => {
    const n = [scan, ...historyService.list()];
    if (!historyService.save(n)) return false;
    setScans(n.slice(0, 40));
    pushEvent({ kind: "scan-saved", label: "Scan saved on this device", link: `/scans/${scan.id}` });
    return true;
  }, [pushEvent]);

  const removeScan = useCallback((id: string) => {
    setScans((c) => { const n = c.filter((s) => s.id !== id); historyService.save(n); return n; });
    setSaved((c) => { const n = c.filter((s) => s.scanId !== id); savedService.save(n); return n; });
  }, []);

  const isSaved = useCallback((kind: SavedKind, k: SaveKey) => saved.some((i) => same(i, kind, k)), [saved]);
  const toggleSaved = useCallback((kind: SavedKind, k: SaveKey) => {
    const exists = saved.some((i) => same(i, kind, k));
    const item: SavedItem = { id: newId(), kind, crop: k.crop, savedAt: new Date().toISOString(), ...(k.slug ? { slug: k.slug } : {}), ...(k.scanId ? { scanId: k.scanId } : {}) };
    const n = exists ? saved.filter((i) => !same(i, kind, k)) : [item, ...saved];
    savedService.save(n);
    setSaved(n);
    if (!exists) pushEvent({ kind: "advisory-saved", label: "Saved for offline reading", link: "/saved" });
    return !exists;
  }, [saved, pushEvent]);
  const removeSaved = useCallback((id: string) => {
    setSaved((c) => { const n = c.filter((i) => i.id !== id); savedService.save(n); return n; });
  }, []);

  const setRem = (fn: (c: Reminder[]) => Reminder[]) => setReminders((c) => { const n = fn(c); reminderService.save(n); return n; });
  const addReminder = useCallback((r: Omit<Reminder, "id" | "createdAt" | "done">) =>
    setRem((c) => [...c, { ...r, id: newId(), createdAt: new Date().toISOString(), done: false }].sort((a, b) => a.dueDate.localeCompare(b.dueDate))), []);
  const toggleReminder = useCallback((id: string) => setRem((c) => c.map((r) => (r.id === id ? { ...r, done: !r.done } : r))), []);
  const removeReminder = useCallback((id: string) => setRem((c) => c.filter((r) => r.id !== id)), []);

  const visitTopic = useCallback((crop: CropKey, slug: string) => {
    setRecent((c) => { const k = `${crop}/${slug}`; const n = [k, ...c.filter((x) => x !== k)].slice(0, 8); recentService.save(n); return n; });
  }, []);

  const ask = useCallback((text: string, ctx: AssistantContext) => {
    const question = text.trim();
    if (!question) return;
    const add = (m: ChatMessage) => setMessages((c) => { const n = [...c, m]; chatStore.save(n); return n; });
    add({ id: newId(), role: "farmer", text: question });
    setTyping(true);
    const local = assistantReply(question, ctx, settings.lang);
    const finish = (txt: string) => { setTyping(false); add({ id: newId(), role: "assistant", text: txt, refs: local.refs, safety: local.safety }); };
    const bridge = getNativeBridge();
    if (bridge?.ask && !local.safety) {
      bridge.ask({ question, context: local.text, lang: settings.lang }).then(finish).catch(() => finish(local.text));
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => finish(local.text), 650);
  }, [settings.lang]);

  const clearChat = useCallback(() => { setMessages([]); chatStore.save([]); }, []);
  const clearData = useCallback((scope: "history" | "saved" | "chat" | "all") => {
    clearUserData(scope);
    if (scope === "history" || scope === "all") { setScans([]); setEvents([]); }
    if (scope === "saved" || scope === "all") setSaved([]);
    if (scope === "chat" || scope === "all") setMessages([]);
    if (scope === "all") { setReminders([]); setRecent([]); }
  }, []);

  const t = useCallback((key: Key) => translate(settings.lang, key), [settings.lang]);

  const value = useMemo<State>(() => ({
    ready, settings, updateSettings, t, lang: settings.lang, online, scans, addScan, removeScan,
    saved, isSaved, toggleSaved, removeSaved, reminders, addReminder, toggleReminder, removeReminder,
    events, pushEvent, recent, visitTopic, messages, typing, ask, clearChat, clearData,
  }), [ready, settings, updateSettings, t, online, scans, addScan, removeScan, saved, isSaved, toggleSaved, removeSaved, reminders, addReminder, toggleReminder, removeReminder, events, pushEvent, recent, visitTopic, messages, typing, ask, clearChat, clearData]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCropCare(): State {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCropCare must be used inside CropCareProvider");
  return c;
}
