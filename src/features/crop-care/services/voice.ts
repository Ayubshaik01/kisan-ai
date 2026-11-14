/**
 * Offline Voice Agent & Speech Synthesizer for KisanAI
 * Uses the Web Speech API (speechSynthesis) which is fully local, offline,
 * and built directly into modern Android WebView and Chromium browsers.
 *
 * Supports regional speech output across 6 languages:
 * en-IN, hi-IN, te-IN, ta-IN, kn-IN, mr-IN
 */

import type { Lang } from "../i18n";

export interface VoicePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  activeText: string | null;
  supported: boolean;
}

const BCP47_LANG_TAGS: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  mr: "mr-IN",
};

class VoiceAgentService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<(state: VoicePlaybackState) => void> = new Set();
  private state: VoicePlaybackState = {
    isPlaying: false,
    isPaused: false,
    activeText: null,
    supported: false,
  };

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.state.supported = true;
    }
  }

  public isSupported(): boolean {
    return this.state.supported && this.synth !== null;
  }

  public getState(): VoicePlaybackState {
    return { ...this.state };
  }

  public subscribe(listener: (state: VoicePlaybackState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.warn("VoiceAgent listener error:", err);
      }
    });
  }

  /**
   * Speak text in the specified farmer language
   */
  public speak(text: string, lang: Lang = "en", onEnd?: () => void): boolean {
    if (!this.synth || !this.isSupported()) {
      console.warn("Speech synthesis is not supported on this platform.");
      return false;
    }

    // Cancel any ongoing speech
    this.stop();

    // Clean markdown, symbols, and formatting for clean natural speech
    const cleanText = text
      .replace(/[*_#`~[\]()<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return false;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetTag = BCP47_LANG_TAGS[lang] || "en-IN";
      utterance.lang = targetTag;
      utterance.rate = 0.95; // Slightly slower, comfortable listening speed for farmers
      utterance.pitch = 1.0;

      // Select regional voice if available
      const voices = this.synth.getVoices();
      const regionalVoice = voices.find(
        (v) => v.lang === targetTag || v.lang.startsWith(targetTag.split("-")[0]!)
      );
      if (regionalVoice) {
        utterance.voice = regionalVoice;
      }

      utterance.onstart = () => {
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.activeText = cleanText;
        this.notify();
      };

      utterance.onend = () => {
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.activeText = null;
        this.currentUtterance = null;
        this.notify();
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn("VoiceAgent playback error:", e);
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.activeText = null;
        this.currentUtterance = null;
        this.notify();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error("Failed to trigger voice playback:", err);
      return false;
    }
  }

  public pause(): void {
    if (this.synth && this.state.isPlaying && !this.state.isPaused) {
      this.synth.pause();
      this.state.isPaused = true;
      this.notify();
    }
  }

  public resume(): void {
    if (this.synth && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.notify();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.state.activeText = null;
      this.currentUtterance = null;
      this.notify();
    }
  }

  public toggle(text: string, lang: Lang = "en"): void {
    if (this.state.isPlaying) {
      if (this.state.isPaused) {
        this.resume();
      } else {
        this.stop();
      }
    } else {
      this.speak(text, lang);
    }
  }
}

export const voiceAgent = new VoiceAgentService();

