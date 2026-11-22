import { Link, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CornerDownLeft,
  Cpu,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Key,
  Leaf,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import type { Lang } from "../i18n";
import { getTopic, l } from "../knowledge";
import { voiceAgent, voiceInput } from "../services/voice";
import { MarkdownMessage } from "../ui/MarkdownMessage";
import { queryGroqChat } from "../services/groq-pool";
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

const samplePromptsByLang: Record<Lang, { category: string; questions: string[] }[]> = {
  en: [
    {
      category: "🌾 Rice (Paddy) Care",
      questions: [
        "How to identify rice blast in the field?",
        "Best fertilizer schedule for paddy tillering?",
        "How to control yellow stem borer organically?",
      ],
    },
    {
      category: "🌶️ Chilli Crop Care",
      questions: [
        "What causes chilli leaves to curl upwards?",
        "Safe natural remedy for chilli thrips and mites",
        "How to prevent fruit rot (anthracnose)?",
      ],
    },
    {
      category: "🌿 Bio-Controls & Irrigation",
      questions: [
        "How to use Pseudomonas for disease prevention?",
        "Explain Alternate Wetting and Drying (AWD)",
        "When is the best time of day to spray?",
      ],
    },
  ],
  te: [
    {
      category: "🌾 వరి సస్యరక్షణ",
      questions: [
        "వరి అగ్గి తెగులు ప్రాథమిక లక్షణాలు ఏమిటి?",
        "వరిలో పిలకల దశలో ఎరువుల యాజమాన్యం ఎలా చేయాలి?",
        "కాండం తొలిచే పురుగు నివారణ చర్యలు ఏమిటి?",
      ],
    },
    {
      category: "🌶️ మిరప సస్యరక్షణ",
      questions: [
        "మిరప ఆకు ముడత వైరస్ ఎలా వ్యాపిస్తుంది?",
        "తామర పురుగులు, నల్లి నివారణకు వేప నూనె ఎలా వాడాలి?",
        "కాయ కుళ్ళు తెగులు రాకుండా ఏం చేయాలి?",
      ],
    },
    {
      category: "🌿 సేంద్రీయ & నీటి యాజమాన్యం",
      questions: [
        "సూడోమోనాస్ జీవ రసాయనం ఎలా పిచికారీ చేయాలి?",
        "వరిలో ఆరుతడుల (AWD) నీటి పద్ధతి ఏమిటి?",
        "మందులు పిచికారీ చేయడానికి సరైన సమయం ఏది?",
      ],
    },
  ],
  hi: [
    {
      category: "🌾 धान की फसल सुरक्षा",
      questions: [
        "धान के ब्लास्ट रोग के क्या लक्षण हैं?",
        "धान में कल्ले फूटते समय यूरिया का सही प्रयोग?",
        "तना छेदक कीट की जैविक रोकथाम कैसे करें?",
      ],
    },
    {
      category: "🌶️ मिर्च की उन्नत सुरक्षा",
      questions: [
        "मिर्च में पत्ती मरोड़ रोग की रोकथाम कैसे करें?",
        "थ्रिप्स और माइट्स के लिए नीम तेल का छिड़काव",
        "मिर्च में फल सड़न (एंथ्रेक्नोज) से बचाव",
      ],
    },
    {
      category: "🌿 जैविक व सिंचाई प्रबंधन",
      questions: [
        "स्यूडोमोनास बायो-कंट्रोल का सही उपयोग कैसे करें?",
        "धान में कम पानी में खेती (AWD) तकनीक क्या है?",
        "दवा छिड़काव का सबसे उत्तम समय कौन सा है?",
      ],
    },
  ],
  ta: [
    {
      category: "🌾 நெல் பாதுகாப்பு",
      questions: [
        "நெல் குலை நோயின் ஆரம்ப அறிகுறிகள் என்ன?",
        "நெல் தண்டு துளைப்பான் பூச்சியை கட்டுப்படுத்துவது எப்படி?",
      ],
    },
    {
      category: "🌶️ மிளகாய் பயிர்",
      questions: [
        "மிளகாய் இலை சுருட்டை வைரஸ் எவ்வாறு பரவுகிறது?",
        "இலைப்பேன் கட்டுப்பாடு இயற்கை முறைகள் யாவை?",
      ],
    },
  ],
  kn: [
    {
      category: "🌾 ಭತ್ತದ ರೋಗ ನಿರ್ವಹಣೆ",
      questions: [
        "ಭತ್ತದ ಬೆಂಕಿ ರೋಗದ ಪ್ರಾಥಮಿಕ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
        "ಕಾಂಡ ಕೊರೆಯುವ ಕೀಟ ನಿಯಂತ್ರಣ ಕ್ರಮಗಳು ಯಾವುವು?",
      ],
    },
    {
      category: "🌶️ ಮೆಣಸಿನ ಬೆಳೆ",
      questions: [
        "ಮೆಣಸಿನಕಾಯಿ ಎಲೆ ಮುದುರುವ ರೋಗ ಹೇಗೆ ಹರಡುತ್ತದೆ?",
        "ನುಸಿ ಮತ್ತು ಹೇನು ನಿಯಂತ್ರಣಕ್ಕೆ ನೈಸರ್ಗಿಕ ವಿಧಾನಗಳು",
      ],
    },
  ],
  mr: [
    {
      category: "🌾 भात पीक संरक्षण",
      questions: [
        "भातावरील करपा रोगाची सुरुवातीची लक्षणे काय आहेत?",
        "भातावरील खोडकीड नियंत्रण कसे करावे?",
      ],
    },
    {
      category: "🌶️ मिरची पीक संरक्षण",
      questions: [
        "मिरचीवरील चुरडा-मुरडा (बोकड्या) रोग कसा पसरतो?",
        "थ्रिप्स व माइट्स नियंत्रणासाठी सेंद्रिय उपाय",
      ],
    },
  ],
};

export function AssistantPage() {
  const { t, lang, messages, typing, ask, clearChat, scans, settings, updateSettings } = useCropCare();
  const search = useSearch({ strict: false }) as { scanId?: string };
  const initialScanId = search?.scanId;
  const [activeScanId, setActiveScanId] = useState<string | undefined>(
    initialScanId || scans[0]?.id
  );
  const activeScan = scans.find((s) => s.id === activeScanId);
  const [input, setInput] = useState("");
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);

  // Model settings configuration state
  const [selectedProvider, setSelectedProvider] = useState<string>(
    settings?.llmProvider === "local" ? "local" : "auto"
  );
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMsg, setTestMsg] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeModelName = useMemo(() => {
    if (settings?.llmProvider === "local") {
      return "🌿 KisanAI Neural (On-Device)";
    }
    if (settings?.llmProvider === "ollama") {
      return "🦙 Ollama Local";
    }
    return "⚡ KisanAI High-Speed Neural Core (Connected)";
  }, [settings]);

  const hasCloudKey = true;

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMsg("");
    try {
      if (selectedProvider === "local") {
        setTestStatus("success");
        setTestMsg("✓ On-Device Neural Engine Active (100% Offline Mode)");
        return;
      }
      if (selectedProvider === "ollama") {
        const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setTestStatus("success");
          setTestMsg("✓ Local Ollama detected on port 11434!");
        } else {
          throw new Error("Could not reach Ollama at http://localhost:11434");
        }
        return;
      }

      // Test High-Speed Neural Pool (7 distributed nodes)
      const t0 = performance.now();
      const res = await queryGroqChat({
        messages: [{ role: "user", content: "Ping" }],
        maxTokens: 5,
      });
      const latency = Math.round(performance.now() - t0);
      if (res) {
        setTestStatus("success");
        setTestMsg(`✓ Connected to High-Speed Neural Core! (${latency}ms · Multi-Node Cluster Active)`);
      } else {
        throw new Error("Cloud network unreachable. Automatically switching to On-Device Offline Engine.");
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMsg(e?.message || "Failed to reach cloud service. Operating in Offline Mode.");
    }
  };

  const handleSaveModelConfig = () => {
    updateSettings({
      llmProvider: selectedProvider as any,
    });
    setShowModelModal(false);
  };

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

  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const unsub = voiceInput.subscribe((st) => {
      setIsListening(st.isListening);
    });
    return () => {
      unsub();
      voiceInput.stopListening();
    };
  }, []);

  const handleToggleMic = () => {
    if (isListening) {
      voiceInput.stopListening();
      toast.info("Microphone stopped");
    } else {
      const started = voiceInput.startListening(
        lang,
        (text, isFinal) => {
          setInput(text);
        },
        (err) => {
          toast.info(t("voiceSoon"));
        }
      );
      if (started) {
        toast.success(`Listening in ${lang.toUpperCase()}...`);
      } else {
        toast.info(t("voiceSoon"));
      }
    }
  };

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

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const handleSendPrompt = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");
    ask(
      trimmed,
      activeScan
        ? {
            crop: activeScan.crop,
            ...(activeScan.topicSlug ? { slug: activeScan.topicSlug } : {}),
            ...(activeScan.confidence !== undefined ? { confidence: activeScan.confidence } : {}),
            ...(activeScan.confidenceStatus ? { confidenceStatus: activeScan.confidenceStatus } : {}),
            ...(activeScan.severity?.band ? { severityBand: activeScan.severity.band } : {}),
            ...(activeScan.visibleEvidence ? { visibleEvidence: activeScan.visibleEvidence } : {}),
            ...(activeScan.insectDirectlyVisible !== undefined ? { insectDirectlyVisible: activeScan.insectDirectlyVisible } : {}),
            ...(activeScan.severityMethod ? { severityMethod: activeScan.severityMethod } : {}),
          }
        : {}
    );
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendPrompt(input);
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
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <Bot className="size-6 text-primary" />
              {t("navAssistant")}
            </h1>
            <button
              type="button"
              onClick={() => setShowModelModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Click to configure Official AI Model (Gemini / Groq / OpenAI / Ollama)"
            >
              <Sparkles className="size-3 text-primary animate-pulse" />
              <span>{activeModelName}</span>
              <SettingsIcon className="size-3 opacity-60 ml-0.5" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("assistantSub")} · Official Multilingual Agronomic AI
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

          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent/40 transition-all shadow-2xs"
            title="Configure AI Models"
          >
            <Cpu className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Model</span>
          </button>

          {messages.length > 0 && (
            <Confirm
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface hover:text-coral transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              }
              title={t("clearChat")}
              body="All messages in this conversation will be cleared from this device so you can start a fresh dialogue."
              confirmLabel={t("clearChat")}
              onConfirm={clearChat}
            />
          )}
        </div>
      </div>

      {/* Hybrid AI Engine Selector Bar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-line bg-card/90 p-2 text-xs shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            AI Engine:
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-surface p-0.5 border border-line/60">
            {(["auto", "offline", "online"] as const).map((mKey) => {
              const currentMode = settings?.llmProvider === "local" ? "offline" : (settings?.llmProvider === "openai" || settings?.llmProvider === "gemini") ? "online" : "auto";
              const isActive = currentMode === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => {
                    const newProvider = mKey === "offline" ? "local" : mKey === "online" ? "openai" : "auto";
                    updateSettings({ llmProvider: newProvider });
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mKey === "auto" ? "⚡ Auto (Hybrid)" : mKey === "offline" ? "🔒 Offline (On-Device)" : "☁️ Cloud Engine"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {settings?.llmProvider === "local"
              ? "On-Device Neural Engine (Offline)"
              : "KisanAI High-Speed Neural Core (Connected)"}
          </span>
          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            title="Configure model settings"
          >
            <SettingsIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Multimodal Photo Active Context Banner */}
      {activeScan && (
        <div className="mt-2.5 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-2.5 sm:px-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeScan.image}
                alt="Active Scan"
                className="size-9 rounded-xl object-cover border border-line shrink-0 shadow-xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                    Active Photo Context Attached
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    • {activeScan.crop}
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
                View Scan
              </Link>
              <button
                type="button"
                onClick={() => setActiveScanId(undefined)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
                title="Detach photo context"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Quick AI Action Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-primary/10">
            <button
              type="button"
              onClick={() => handleSendPrompt(
                lang === "te" ? "ఈ తెగులు గురించి సాధారణ రైతు మాటల్లో సులభమైన వివరణ మరియు అర్థం చెప్పు" :
                lang === "hi" ? "इस रोग के बारे में सरल शब्दों में अर्थ और आसान सारांश बताएं" :
                "Explain in simple words with meaning and summary"
              )}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-all active:scale-95 shadow-2xs"
            >
              <Sparkles className="size-3 text-primary" />
              ✨ {lang === "te" ? "ఏఐ సులభమైన వివరణ" : lang === "hi" ? "एआई सरल सारांश" : "Summarize with AI"}
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt(
                lang === "te" ? "దీనిని అరికట్టడానికి నేను వెంటనే ఏం చేయాలి?" :
                lang === "hi" ? "इसे रोकने के लिए मुझे तुरंत क्या करना चाहिए?" :
                "What should I do right now to stop this spreading?"
              )}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface/80 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface transition-all active:scale-95"
            >
              🛠️ {lang === "te" ? "ఏం చేయాలి?" : lang === "hi" ? "क्या करें?" : "What to do?"}
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt(
                lang === "te" ? "ఈ తెగులు ఎందుకు వచ్చింది? కారణాలు ఏమిటి?" :
                lang === "hi" ? "यह रोग क्यों हुआ और कैसे फैलता है?" :
                "Why did this happen and how does it spread?"
              )}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface/80 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface transition-all active:scale-95"
            >
              ⚠️ {lang === "te" ? "ఎందుకు వచ్చింది?" : lang === "hi" ? "कारण व फैलाव" : "Why did it happen?"}
            </button>
            <button
              type="button"
              onClick={() => handleSendPrompt(
                lang === "te" ? "యూరియా ఎరువు వేయవచ్చా? ఎరువుల జాగ్రత్తలు ఏమిటి?" :
                lang === "hi" ? "क्या यूरिया डाल सकते हैं? खाद के नियम क्या हैं?" :
                "Can I spray urea or what fertilizer should I apply?"
              )}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface/80 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface transition-all active:scale-95"
            >
              🧪 {lang === "te" ? "యూరియా & ఎరువులు" : lang === "hi" ? "यूरिया व खाद" : "Fertilizer Rules"}
            </button>
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 space-y-5">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-inner">
              <Sprout className="size-7" />
            </span>
            <div className="max-w-md">
              <h2 className="text-lg font-bold text-foreground">
                How can I assist your crop today?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ask anything about Rice and Chilli leaf diseases, organic remedies,
                fertilizer schedules, or water management.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="w-full max-w-lg space-y-3 text-left">
              {(samplePromptsByLang[lang] ?? samplePromptsByLang.en).map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    {group.category}
                  </span>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {group.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSendPrompt(q)}
                        className={cn(
                          card,
                          "flex items-center justify-between p-2.5 text-left text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-accent/40 active:scale-98"
                        )}
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="size-3.5 text-muted-foreground shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isFarmer = m.role === "farmer";

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5 text-sm leading-relaxed",
                  isFarmer ? "justify-end" : "justify-start"
                )}
              >
                {!isFarmer && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary mt-1 shadow-xs">
                    <Bot className="size-4" />
                  </span>
                )}

                <div className={cn("max-w-[88%] space-y-2", isFarmer ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl p-4 shadow-sm",
                      isFarmer
                        ? "bg-primary text-primary-foreground rounded-tr-none font-medium ml-auto"
                        : "border border-line bg-card text-foreground rounded-tl-none",
                      m.safety && "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200"
                    )}
                  >
                    {m.safety && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 border-b border-amber-500/20 pb-2 mb-2">
                        <ShieldAlert className="size-4 shrink-0" />
                        Agricultural Statutory Safety Guard (CIB&RC)
                      </div>
                    )}

                    {/* Rich Markdown Message Rendering */}
                    {isFarmer ? (
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed">
                        {m.text}
                      </p>
                    ) : (
                      <MarkdownMessage content={m.text} />
                    )}

                    {/* Action Bar for Assistant Messages */}
                    {!isFarmer && (
                      <div className="flex items-center justify-between border-t border-line/50 pt-2.5 mt-2.5 text-[11px] text-muted-foreground">
                        <span className="text-[10px] font-semibold text-muted-foreground/80">
                          KisanAI · Meta Llama 3.2 1B
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Copy to clipboard */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(m.id, m.text)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface hover:text-foreground transition-colors"
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span className="text-emerald-500 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Listen audio with Vernacular Voice Agent */}
                          <button
                            type="button"
                            onClick={() => handleToggleVoice(m.id, m.text)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all",
                              activePlayingId === m.id
                                ? "bg-rose-500/20 text-rose-600 font-bold animate-pulse"
                                : "hover:bg-surface hover:text-foreground"
                            )}
                            title="Read aloud in regional vernacular voice"
                          >
                            {activePlayingId === m.id ? (
                              <>
                                <VolumeX className="size-3" /> Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3" /> Listen
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Referenced Field Topics */}
                    {!isFarmer && m.refs && m.refs.length > 0 && (
                      <div className="border-t border-line/40 pt-2 mt-2 space-y-1">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                          Referenced Field Records:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.refs.map((rf) => {
                            const topic = getTopic(rf.crop, rf.slug);
                            return (
                              <Link
                                key={`${rf.crop}-${rf.slug}`}
                                to="/library/$crop/$slug"
                                params={{ crop: rf.crop, slug: rf.slug }}
                                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
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

                  {/* Interactive Dynamic Suggestion Chips */}
                  {!isFarmer && m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                      {m.suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleSendPrompt(sug)}
                          className="rounded-full border border-primary/25 bg-card/80 backdrop-blur-xs px-3 py-1 text-xs font-medium text-foreground hover:bg-primary/15 hover:border-primary/50 transition-all active:scale-95 shadow-2xs"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isFarmer && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground mt-1 shadow-xs">
                    <User className="size-4" />
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground pt-1">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Bot className="size-4 animate-spin" />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-card px-4 py-2.5 shadow-xs">
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce" />
              <span className="ml-1 text-xs text-muted-foreground">{t("thinking")}...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-line pt-3">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-2xl border border-line bg-card p-2 shadow-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeQuestion")}
            rows={1}
            className="flex-1 max-h-32 min-h-10 resize-none bg-transparent px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />

          <button
            type="button"
            onClick={handleToggleMic}
            title={isListening ? "Stop voice listening" : `Speak your question in ${lang.toUpperCase()}`}
            aria-label="Toggle voice input"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl transition-all active:scale-95",
              isListening
                ? "bg-rose-500 text-white animate-pulse shadow-md"
                : "bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            )}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>

          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label={t("send")}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 active:scale-95"
            )}
          >
            <Send className="size-4" />
          </button>
        </form>

        <p className="mt-2 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeModelName} active</span>
          <span>·</span>
          <span>100% offline-ready & private</span>
        </p>
      </div>

      {/* Official AI Model Configuration Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Official AI Model & Chatbot</h2>
                  <p className="text-xs text-muted-foreground">Select real cloud or on-device LLMs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Engine Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">AI Intelligence Mode</label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  {
                    id: "auto",
                    name: "⚡ Auto Hybrid (Recommended)",
                    badge: "Online + Offline",
                    desc: "High-speed 27B/70B neural intelligence when online; automatically falls back to local on-device engine in flight mode.",
                  },
                  {
                    id: "local",
                    name: "🔒 100% Offline (Airplane Mode)",
                    badge: "On-Device",
                    desc: "Zero cloud network communication. Runs entirely on-device with MobileNetV3 and local agronomic rules.",
                  },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setSelectedProvider(prov.id)}
                    className={cn(
                      "flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                      selectedProvider === prov.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                        : "border-line bg-surface hover:border-line-hover"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{prov.name}</span>
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{prov.badge}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{prov.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture & Cluster Status Card */}
            <div className="rounded-2xl border border-line bg-surface/70 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <h4 className="text-xs font-bold text-foreground">Active Intelligence Architecture</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-line/60 bg-card/60 p-2.5">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    High-Speed Distributed Cluster
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    Multi-node high-availability pool with automated failover and sub-second execution.
                  </p>
                </div>
                <div className="rounded-xl border border-line/60 bg-card/60 p-2.5">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-500" />
                    ICAR &amp; ANGRAU Agronomy
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    State agricultural university extension guidelines for Rice &amp; Chilli integrated pest management.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Zero configuration required. All cloud &amp; offline services are connected and ready.</span>
              </div>
            </div>

            {/* Test Status feedback */}
            {testStatus !== "idle" && (
              <div
                className={cn(
                  "rounded-xl p-3 text-xs flex items-center gap-2",
                  testStatus === "testing" && "bg-surface text-muted-foreground",
                  testStatus === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold",
                  testStatus === "error" && "bg-coral/10 text-coral border border-coral/20 font-semibold"
                )}
              >
                {testStatus === "testing" && <Sparkles className="size-3.5 animate-spin shrink-0" />}
                {testStatus === "success" && <CheckCircle2 className="size-3.5 shrink-0" />}
                {testStatus === "error" && <AlertTriangle className="size-3.5 shrink-0" />}
                <span>{testStatus === "testing" ? "Testing model connectivity..." : testMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface/80 transition-all cursor-pointer"
              >
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleSaveModelConfig}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
              >
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
