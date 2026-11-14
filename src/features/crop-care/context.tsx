import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { translate, type Key, type Lang } from "./i18n";
import type { CropKey } from "./knowledge";
import { registerCropCareAppShell } from "./pwa";
import { assistantReply, type AssistantContext } from "./services/advisory";
import { getNativeBridge } from "./services/native";
import {
  chatStore, clearUserData, defaultSettings, eventService, historyService, newId, recentService, reminderService, savedService, settingsService,
} from "./services/store";
import type { ChatMessage, LocalEvent, Reminder, SavedItem, SavedKind, Scan, Settings } from "./services/types";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

type State = {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  t: (key: Key) => string;
  lang: Lang;
  online: boolean;
  scans: Scan[];
  addScan: (scan: Scan) => boolean;
  updateScan: (id: string, patch: Partial<Scan>) => void;
  removeScan: (id: string) => void;
  saved: SavedItem[];
  isSaved: (kind: SavedKind, key: { slug?: string; scanId?: string; crop: CropKey }) => boolean;
  toggleSaved: (kind: SavedKind, key: { slug?: string; scanId?: string; crop: CropKey }) => boolean;
  removeSaved: (id: string) => void;
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, "id" | "createdAt" | "done">) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  events: LocalEvent[];
  recent: string[];
  visitTopic: (crop: CropKey, slug: string) => void;
  messages: ChatMessage[];
  typing: boolean;
  ask: (text: string, ctx: AssistantContext) => void;
  clearChat: () => void;
  clearData: (scope: "history" | "saved" | "chat" | "all") => void;
  canInstall: boolean;
  install: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);

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
    const prompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);

  // Theme + document language
  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.lang;
    const apply = () => {
      const resolved = settings.theme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : settings.theme;
      root.dataset["theme"] = resolved;
    };
    apply();
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [settings.theme, settings.lang]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      settingsService.save(next);
      return next;
    });
  }, []);

  const pushEvent = useCallback((event: Omit<LocalEvent, "id" | "at">) => {
    setEvents((current) => {
      const next = [{ ...event, id: newId(), at: new Date().toISOString() }, ...current];
      eventService.save(next);
      return next;
    });
  }, []);

  const addScan = useCallback((scan: Scan) => {
    const next = [scan, ...historyService.list()];
    if (!historyService.save(next)) return false;
    setScans(next.slice(0, 40));
    pushEvent({ kind: "scan-saved", label: "Scan saved on this device", link: `/scans/${scan.id}` });
    return true;
  }, [pushEvent]);

  const updateScan = useCallback((id: string, patch: Partial<Scan>) => {
    setScans((current) => {
      const next = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
      historyService.save(next);
      return next;
    });
  }, []);

  const removeScan = useCallback((id: string) => {
    setScans((current) => {
      const next = current.filter((s) => s.id !== id);
      historyService.save(next);
      return next;
    });
    setSaved((current) => {
      const next = current.filter((s) => s.scanId !== id);
      savedService.save(next);
      return next;
    });
  }, []);

  const matches = (item: SavedItem, kind: SavedKind, key: { slug?: string; scanId?: string; crop: CropKey }) =>
    item.kind === kind && item.crop === key.crop && item.slug === key.slug && item.scanId === key.scanId;

  const isSaved = useCallback((kind: SavedKind, key: { slug?: string; scanId?: string; crop: CropKey }) => saved.some((i) => matches(i, kind, key)), [saved]);

  const toggleSaved = useCallback((kind: SavedKind, key: { slug?: string; scanId?: string; crop: CropKey }) => {
    const exists = saved.some((i) => matches(i, kind, key));
    const next = exists ? saved.filter((i) => !matches(i, kind, key)) : [{ id: newId(), kind, ...key, savedAt: new Date().toISOString() }, ...saved];
    savedService.save(next);
    setSaved(next);
    if (!exists) pushEvent({ kind: "advisory-saved", label: "Saved for offline reading", link: "/saved" });
    return !exists;
  }, [saved, pushEvent]);

  const removeSaved = useCallback((id: string) => {
    setSaved((current) => {
      const next = current.filter((i) => i.id !== id);
      savedService.save(next);
      return next;
    });
  }, []);

  const addReminder = useCallback((r: Omit<Reminder, "id" | "createdAt" | "done">) => {
    setReminders((current) => {
      const next = [...current, { ...r, id: newId(), createdAt: new Date().toISOString(), done: false }].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      reminderService.save(next);
      return next;
    });
  }, []);
  const toggleReminder = useCallback((id: string) => {
    setReminders((current) => {
      const next = current.map((r) => (r.id === id ? { ...r, done: !r.done } : r));
      reminderService.save(next);
      return next;
    });
  }, []);
  const removeReminder = useCallback((id: string) => {
    setReminders((current) => {
      const next = current.filter((r) => r.id !== id);
      reminderService.save(next);
      return next;
    });
  }, []);

  const visitTopic = useCallback((crop: CropKey, slug: string) => {
    setRecent((current) => {
      const key = `${crop}/${slug}`;
      const next = [key, ...current.filter((k) => k !== key)].slice(0, 8);
      recentService.save(next);
      return next;
    });
  }, []);

  const ask = useCallback((text: string, ctx: AssistantContext) => {
    const question = text.trim();
    if (!question) return;
    const farmer: ChatMessage = { id: newId(), role: "farmer", text: question };
    setMessages((current) => { const next = [...current, farmer]; chatStore.save(next); return next; });
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    const finish = (reply: ChatMessage) => {
      setTyping(false);
      setMessages((current) => { const next = [...current, reply]; chatStore.save(next); return next; });
    };
    const local = assistantReply(question, ctx, settings.lang);
    const bridge = getNativeBridge();
    if (bridge?.ask && !local.safety) {
      bridge.ask({ question, context: local.text, lang: settings.lang })
        .then((answer) => finish({ id: newId(), role: "assistant", text: answer, refs: local.refs }))
        .catch(() => finish({ id: newId(), role: "assistant", text: local.text, refs: local.refs }));
      return;
    }
    typingTimer.current = window.setTimeout(() => finish({ id: newId(), role: "assistant", text: local.text, refs: local.refs, safety: local.safety }), 650);
  }, [settings.lang]);

  const clearChat = useCallback(() => { setMessages([]); chatStore.save([]); }, []);

  const clearData = useCallback((scope: "history" | "saved" | "chat" | "all") => {
    clearUserData(scope);
    if (scope === "history" || scope === "all") { setScans([]); setEvents([]); }
    if (scope === "saved" || scope === "all") setSaved([]);
    if (scope === "chat" || scope === "all") setMessages([]);
    if (scope === "all") { setReminders([]); setRecent([]); }
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }, [installPrompt]);

  const t = useCallback((key: Key) => translate(settings.lang, key), [settings.lang]);

  const value = useMemo<State>(() => ({
    ready, settings, updateSettings, t, lang: settings.lang, online,
    scans, addScan, updateScan, removeScan,
    saved, isSaved, toggleSaved, removeSaved,
    reminders, addReminder, toggleReminder, removeReminder,
    events, recent, visitTopic,
    messages, typing, ask, clearChat, clearData,
    canInstall: installPrompt !== null, install,
  }), [ready, settings, updateSettings, t, online, scans, addScan, updateScan, removeScan, saved, isSaved, toggleSaved, removeSaved, reminders, addReminder, toggleReminder, removeReminder, events, recent, visitTopic, messages, typing, ask, clearChat, clearData, installPrompt, install]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCropCare(): State {
  const context = useContext(Ctx);
  if (!context) throw new Error("useCropCare must be used inside CropCareProvider");
  return context;
}
