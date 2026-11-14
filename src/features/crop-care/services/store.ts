import type { LocalEvent, Reminder, SavedItem, Scan, Settings } from "./types";

/**
 * Web-preview persistence on localStorage. The Android app replaces this with Room/SQLite;
 * localStorage is not equivalent (size-limited, cleared with browser data).
 */
const KEYS = {
  scans: "oaca.scans.v1",
  saved: "oaca.saved.v1",
  settings: "oaca.settings.v1",
  reminders: "oaca.reminders.v1",
  events: "oaca.events.v1",
  recent: "oaca.recent.v1",
  chat: "oaca.chat.v1",
} as const;
export type StoreKey = keyof typeof KEYS;

export const defaultSettings: Settings = {
  onboarded: false,
  name: "",
  lang: "en",
  theme: "dark",
  state: "Andhra Pradesh",
  district: "Guntur",
  season: "kharif",
  crops: ["rice", "chilli"],
};

function read<T>(key: StoreKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: StoreKey, value: unknown): boolean {
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const historyService = {
  list: (): Scan[] => read<Scan[]>("scans", []),
  save: (scans: Scan[]) => write("scans", scans.slice(0, 40)),
  clear: () => write("scans", []),
};
export const savedService = { list: () => read<SavedItem[]>("saved", []), save: (items: SavedItem[]) => write("saved", items), clear: () => write("saved", []) };
export const settingsService = {
  load: (): Settings => ({ ...defaultSettings, ...read<Partial<Settings>>("settings", {}) }),
  save: (settings: Settings) => write("settings", settings),
};
export const reminderService = { list: () => read<Reminder[]>("reminders", []), save: (items: Reminder[]) => write("reminders", items) };
export const eventService = { list: () => read<LocalEvent[]>("events", []), save: (items: LocalEvent[]) => write("events", items.slice(0, 50)) };
export const recentService = { list: () => read<string[]>("recent", []), save: (items: string[]) => write("recent", items.slice(0, 8)) };
export const chatStore = { list: <T,>() => read<T[]>("chat", []), save: (items: unknown[]) => write("chat", items.slice(-60)) };

/** Bytes used per app area on this device (UTF-16 → ~2 bytes per char). */
export function storageUsage(): Record<StoreKey, number> {
  const out = {} as Record<StoreKey, number>;
  for (const key of Object.keys(KEYS) as StoreKey[]) {
    let size = 0;
    try { size = (window.localStorage.getItem(KEYS[key])?.length ?? 0) * 2; } catch { size = 0; }
    out[key] = size;
  }
  return out;
}

/** Clears user data only. Bundled knowledge and any installed models are never touched. */
export function clearUserData(scope: "history" | "saved" | "chat" | "all") {
  if (scope === "history" || scope === "all") { write("scans", []); write("events", []); }
  if (scope === "saved" || scope === "all") write("saved", []);
  if (scope === "chat" || scope === "all") write("chat", []);
  if (scope === "all") { write("reminders", []); write("recent", []); }
}

export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
