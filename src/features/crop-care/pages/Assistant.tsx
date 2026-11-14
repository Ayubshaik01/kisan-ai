import { Link, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  Image as ImageIcon,
  Info,
  Leaf,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import type { Lang } from "../i18n";
import { getTopic, l } from "../knowledge";
import { voiceAgent } from "../services/voice";
import {
  btn,
  btnGhost,
  btnPrimary,
  btnSecondary,
  card,
  Confirm,
  enter,
  PageHeader,
} from "../ui";

const samplePromptsByLang: Record<Lang, string[]> = {
  en: [
    "How to identify rice blast in the field?",
    "What causes chilli leaves to curl up?",
    "How to tell brown spot from blast?",
    "Signs of yellow stem borer in paddy",
  ],
  hi: [
    "धान के ब्लास्ट रोग के क्या लक्षण हैं?",
    "मिर्च में पत्ती मरोड़ रोग की रोकथाम कैसे करें?",
    "धान में भूरा धब्बा और ब्लास्ट में क्या अंतर है?",
    "धान के तना छेदक कीट की पहचान कैसे करें?",
  ],
  te: [
    "వరి అగ్గి తెగులు ప్రాథమిక లక్షణాలు ఏమిటి?",
    "మిరప ఆకు ముడత వైరస్ ఎలా వ్యాపిస్తుంది?",
    "వరిలో గోధుమ మచ్చ మరియు అగ్గి తెగులు తేడా ఏమిటి?",
    "వరి కాండం తొలిచే పురుగు నివారణ చర్యలు ఏమిటి?",
  ],
  ta: [
    "நெல் குலை நோயின் ஆரம்ப அறிகுறிகள் என்ன?",
    "மிளகாய் இலை சுருட்டை வைரஸ் எவ்வாறு பரவுகிறது?",
    "நெல் தண்டு துளைப்பான் பூச்சியை எவ்வாறு கட்டுப்படுத்துவது?",
    "பழுப்பு புள்ளி நோய்க்கான மேலாண்மை முறைகள் யாவை?",
  ],
  kn: [
    "ಭತ್ತದ ಬೆಂಕಿ ರೋಗದ ಪ್ರಾಥಮಿಕ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
    "ಮೆಣಸಿನಕಾಯಿ ಎಲೆ ಮುದುರುವ ರೋಗ ಹೇಗೆ ಹರಡುತ್ತದೆ?",
    "ಭತ್ತದ ಕಾಂಡ ಕೊರೆಯುವ ಕೀಟವನ್ನು ನಿಯಂತ್ರಿಸುವುದು ಹೇಗೆ?",
    "ಕಂದು ಮಚ್ಚೆ ರೋಗದ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
  ],
  mr: [
    "भातावरील करपा रोगाची सुरुवातीची लक्षणे काय आहेत?",
    "मिरचीवरील चुरडा-मुरडा (बोकड्या) रोग कसा पसरतो?",
    "भातावरील खोडकीड कशी ओळखावी?",
    "तपकिरी ठिपके रोगाची लक्षणे कोणती?",
  ],
};

export function AssistantPage() {
  const { t, lang, messages, typing, ask, clearChat, scans, updateSettings } = useCropCare();
  const search = useSearch({ strict: false }) as { scanId?: string };
  const initialScanId = search?.scanId;
  const [activeScanId, setActiveScanId] = useState<string | undefined>(
    initialScanId || scans[0]?.id
  );
  const activeScan = scans.find((s) => s.id === activeScanId);
  const [input, setInput] = useState("");
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    const unsub = voiceAgent.subscribe((st) => {
      if (!st.isPlaying) {
        setActivePlayingId(null);
      }
    });
    return () => {
      unsub();
      voiceAgent.stop();
    };
  }, []);

  const handleToggleVoice = (msgId: string, text: string) => {
    if (activePlayingId === msgId) {
      voiceAgent.stop();
      setActivePlayingId(null);
    } else {
      setActivePlayingId(msgId);
      voiceAgent.speak(text, lang, () => {
        setActivePlayingId(null);
      });
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    ask(
      text,
      activeScan
        ? {
            crop: activeScan.crop,
            ...(activeScan.topicSlug ? { slug: activeScan.topicSlug } : {}),
            ...(activeScan.confidence !== undefined ? { confidence: activeScan.confidence } : {}),
            ...(activeScan.severity?.band ? { severityBand: activeScan.severity.band } : {}),
          }
        : {}
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col h-[calc(100dvh-9rem)] max-w-3xl mx-auto", enter)}>
      {/* Top Header */}
      <div className="flex flex-col gap-2.5 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("navAssistant")}
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              Llama 3.2 1B · Multimodal
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("assistantSub")} · Grounded in ANGRAU / PJTSAU / ICAR records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Multilingual Switcher */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-surface p-1">
            {(["en", "te", "hi", "ta", "kn", "mr"] as const).map((lCode) => (
              <button
                key={lCode}
                type="button"
                onClick={() => updateSettings({ lang: lCode })}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-semibold transition-all",
                  lang === lCode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {lCode === "en" ? "EN" : lCode === "te" ? "తె" : lCode === "hi" ? "हि" : lCode === "ta" ? "த" : lCode === "kn" ? "ಕ" : "म"}
              </button>
            ))}
          </div>

          {messages.length > 0 && (
            <Confirm
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-coral transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              }
              title={t("clearChat")}
              body="All messages in this conversation will be cleared from this device."
              confirmLabel={t("clearChat")}
              onConfirm={clearChat}
            />
          )}
        </div>
      </div>

      {/* Multimodal Photo Active Context Banner */}
      {activeScan && (
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-2 sm:px-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={activeScan.image}
              alt="Active Scan"
              className="size-9 rounded-xl object-cover border border-line shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                  Photo Context Attached
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {activeScan.crop}
                </span>
              </div>
              <p className="truncate text-xs font-semibold text-foreground">
                {activeScan.topicSlug
                  ? l(
                      lang,
                      getTopic(activeScan.crop, activeScan.topicSlug)?.name || {
                        en: activeScan.topicSlug,
                        hi: activeScan.topicSlug,
                        te: activeScan.topicSlug,
                      }
                    )
                  : "Field Specimen"}
                {activeScan.severity && ` · ${activeScan.severity.band}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/scans/$scanId"
              params={{ scanId: activeScan.id }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => setActiveScanId(undefined)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
              title="Detach photo"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Bot className="size-7" />
            </span>
            <div className="max-w-md">
              <h2 className="text-lg font-bold text-foreground">
                How can I assist your crop today?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ask about rice or chilli leaf symptoms, insect pests, preventive
                measures or scouting techniques.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="w-full max-w-md pt-2 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-left">
                Suggested questions:
              </p>
              <div className="grid gap-2">
                {(samplePromptsByLang[lang] ?? samplePromptsByLang.en).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setInput(q);
                    }}
                    className={cn(
                      card,
                      "flex items-center justify-between p-3 text-left text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-accent/40",
                    )}
                  >
                    <span>{q}</span>
                    <ChevronRight className="size-3.5 text-subtle" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isFarmer = m.role === "farmer";

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 text-sm leading-relaxed",
                  isFarmer ? "justify-end" : "justify-start",
                )}
              >
                {!isFarmer && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary mt-1">
                    <Bot className="size-4" />
                  </span>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl p-4 space-y-2.5",
                    isFarmer
                      ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                      : "border border-line bg-card text-foreground rounded-tl-none shadow-sm",
                    m.safety && "border-amber/40 bg-amber/10 text-amber",
                  )}
                >
                  {m.safety && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber border-b border-amber/20 pb-2">
                      <ShieldAlert className="size-4" /> Agricultural Safety
                      Guard
                    </div>
                  )}

                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed">
                    {m.text}
                  </p>

                  {/* Offline Voice Agent read aloud button for assistant answers */}
                  {!isFarmer && (
                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleVoice(m.id, m.text)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all",
                          activePlayingId === m.id
                            ? "bg-rose-500/20 text-rose-600 animate-pulse font-bold"
                            : "text-muted-foreground hover:bg-surface hover:text-foreground"
                        )}
                        title="Voice Agent: Listen in regional audio"
                      >
                        {activePlayingId === m.id ? (
                          <>
                            <VolumeX className="size-3.5" /> Stop Voice
                          </>
                        ) : (
                          <>
                            <Volume2 className="size-3.5" /> Listen Voice
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Referenced Topics Cards */}
                  {!isFarmer && m.refs && m.refs.length > 0 && (
                    <div className="border-t border-line/60 pt-2.5 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-subtle">
                        Referenced Field Topics:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.refs.map((rf) => {
                          const topic = getTopic(rf.crop, rf.slug);
                          return (
                            <Link
                              key={`${rf.crop}-${rf.slug}`}
                              to="/library/$crop/$slug"
                              params={{ crop: rf.crop, slug: rf.slug }}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Leaf className="size-3" />
                              {topic ? l(lang, topic.name) : rf.slug}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isFarmer && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground mt-1">
                    <User className="size-4" />
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Bot className="size-4 animate-spin" />
            </span>
            <span className="rounded-2xl border border-line bg-card px-4 py-2 text-xs">
              {t("thinking")}
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-line pt-3">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-2xl border border-line bg-card p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeQuestion")}
            rows={1}
            className="flex-1 max-h-32 min-h-10 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-subtle"
          />

          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label={t("send")}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 active:scale-95",
            )}
          >
            <Send className="size-4" />
          </button>
        </form>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {t("llmMissing")}
        </p>
      </div>
    </div>
  );
}
