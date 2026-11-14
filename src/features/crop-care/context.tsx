import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { answerLocally } from "./data";
import { registerCropCareAppShell } from "./pwa";
import { clearScans, deleteScan, readPreference, readScans, savePreference, saveScan, type LocalScan } from "./storage";

export const languages = ["English", "తెలుగు", "हिन्दी"] as const;
export type Language = (typeof languages)[number];
export const languageNames: Record<Language, string> = { English: "English", తెలుగు: "Telugu", हिन्दी: "Hindi" };
export const languageShort: Record<Language, string> = { English: "EN", తెలుగు: "తె", हिन्दी: "हि" };
export type Theme = "dark" | "light";
export type ChatMessage = { id: string; role: "farmer" | "guide"; text: string };
export type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

type CropCareState = {
  ready: boolean;
  scans: LocalScan[];
  storageIssue: boolean;
  addScan: (scan: LocalScan) => boolean;
  removeScan: (id: string) => void;
  clearAll: () => void;
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  canInstall: boolean;
  install: () => Promise<void>;
  messages: ChatMessage[];
  ask: (text: string) => void;
  clearChat: () => void;
};

const CropCareContext = createContext<CropCareState | null>(null);

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function CropCareProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [scans, setScans] = useState<LocalScan[]>([]);
  const [storageIssue, setStorageIssue] = useState(false);
  const [language, setLanguageState] = useState<Language>("English");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      setScans(readScans());
      const savedLanguage = readPreference("language");
      if (languages.includes(savedLanguage as Language)) setLanguageState(savedLanguage as Language);
      const savedTheme = readPreference("theme");
      if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
    } catch {
      setStorageIssue(true);
    }
    setReady(true);
    void registerCropCareAppShell();
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  useEffect(() => {
    const listen = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", listen);
    return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);

  const addScan = useCallback((scan: LocalScan) => {
    try {
      setScans(saveScan(scan));
      return true;
    } catch {
      return false;
    }
  }, []);

  const removeScan = useCallback((id: string) => {
    try {
      setScans(deleteScan(id));
    } catch {
      setStorageIssue(true);
    }
  }, []);

  const clearAll = useCallback(() => {
    try {
      clearScans();
      setScans([]);
      setStorageIssue(false);
    } catch {
      setStorageIssue(true);
    }
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    savePreference("language", next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    savePreference("theme", next);
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }, [installPrompt]);

  const ask = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: newId(), role: "farmer", text: trimmed },
      { id: newId(), role: "guide", text: answerLocally(trimmed) },
    ]);
  }, []);

  const value = useMemo<CropCareState>(
    () => ({
      ready, scans, storageIssue, addScan, removeScan, clearAll,
      language, setLanguage, theme, setTheme,
      canInstall: installPrompt !== null, install,
      messages, ask, clearChat: () => setMessages([]),
    }),
    [ready, scans, storageIssue, addScan, removeScan, clearAll, language, setLanguage, theme, setTheme, installPrompt, install, messages, ask],
  );

  return <CropCareContext.Provider value={value}>{children}</CropCareContext.Provider>;
}

export function useCropCare(): CropCareState {
  const context = useContext(CropCareContext);
  if (!context) throw new Error("useCropCare must be used inside CropCareProvider");
  return context;
}
