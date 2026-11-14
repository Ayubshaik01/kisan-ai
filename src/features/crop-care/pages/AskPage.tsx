import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, Copy, Leaf, RotateCcw, Send, ShieldCheck, Sprout, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { suggestedQuestions } from "../data";
import { cardClass, Eyebrow, PageHeader, pageEnter, StatusPill } from "../ui";

const localized = {
  English: { questions: suggestedQuestions, placeholder: "Ask about your crop…" },
  తెలుగు: { questions: ["మిరప ఆకులు ఎందుకు పసుపు రంగులోకి మారుతున్నాయి?", "వరి తెగులును ఎలా గుర్తించాలి?", "ఫోటో తీసిన తర్వాత ఏమి చేయాలి?", "పంటను పురుగుల నుంచి ఎలా కాపాడాలి?"], placeholder: "మీ పంట గురించి అడగండి..." },
  हिन्दी: { questions: ["मिर्च के पत्ते पीले क्यों हो रहे हैं?", "धान में ब्लास्ट कैसे पहचानें?", "फ़ोटो लेने के बाद क्या करें?", "फसल को कीटों से कैसे बचाएँ?"], placeholder: "अपनी फसल के बारे में पूछें..." },
} as const;
const promptKeys = ["chilli yellow leaves", "rice blast", "after photo", "crop pests"];

export function AskPage() {
  const { language, messages, ask, clearChat } = useCropCare();
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const copy = localized[language];

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(text);
    setText("");
  }

  async function copyReply(id: string, reply: string) {
    try {
      await navigator.clipboard.writeText(reply);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div className={cn(pageEnter, "mx-auto max-w-3xl")}>
      <PageHeader
        eyebrow="Local crop guidance"
        title="A thoughtful field guide."
        description="Ask about common chilli and rice symptoms. Replies come from guidance stored on this device."
        aside={<StatusPill tone="green">Offline</StatusPill>}
      />

      <section className={cn(cardClass, "min-h-[340px] p-4 sm:p-6")} aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary"><Sprout className="size-6" /></span>
            <Eyebrow className="mt-4">What have you noticed?</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold">Start with what you see.</h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">Share a crop and a symptom. I can suggest what to check next, but I can’t identify disease from a photo.</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {copy.questions.map((question, index) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => ask(language === "English" ? question : promptKeys[index] ?? question)}
                  className="group flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <Leaf className="size-4 shrink-0 text-primary" />
                  <span className="flex-1">{question}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearChat}><RotateCcw /> New conversation</Button>
            </div>
            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-3", message.role === "farmer" && "flex-row-reverse")}>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border border-line", message.role === "guide" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {message.role === "farmer" ? <UserRound className="size-4" /> : <Leaf className="size-4" />}
                </span>
                <div className={cn("min-w-0 max-w-[85%] rounded-2xl px-4 py-3", message.role === "farmer" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm border border-line bg-background")}>
                  <p className="text-[15px] leading-relaxed">{message.text}</p>
                  {message.role === "guide" && (
                    <button type="button" onClick={() => copyReply(message.id, message.text)} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" aria-label="Copy reply">
                      {copiedId === message.id ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </section>

      <form onSubmit={submit} className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 mt-3 flex gap-2 rounded-2xl border border-line bg-card/95 p-2 shadow-forest backdrop-blur lg:bottom-4">
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder={copy.placeholder} aria-label="Ask about your crop" maxLength={500} className="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0" />
        <Button type="submit" size="icon" className="size-12 rounded-xl" aria-label="Send question" disabled={!text.trim()}><Send className="size-5" /></Button>
      </form>
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /> Guidance is not a diagnosis. For treatment, confirm with a local agricultural expert.</p>
      <Link to="/guide" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm text-primary"><BookOpen className="size-4" /> Read the full crop guide</Link>
    </div>
  );
}
