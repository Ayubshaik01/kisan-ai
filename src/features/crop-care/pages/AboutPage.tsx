import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Camera, Check, MessageCircle, ShieldCheck, WifiOff, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cardClass, Eyebrow, IconBadge, PageHeader, pageEnter } from "../ui";

const steps = [
  { icon: Camera, title: "Photograph", text: "Save a crop photo with a short note about what you saw." },
  { icon: BookOpen, title: "Compare", text: "Read what to look for in the chilli and rice guides." },
  { icon: MessageCircle, title: "Ask", text: "Get careful next steps, then confirm with a local expert." },
];
const can = ["Keep dated crop photos and notes", "Show plain-language symptom guides", "Answer common field questions", "Work with no internet connection"];
const cannot = ["Identify a disease from a photo", "Estimate how severe a problem is", "Recommend pesticides or doses", "Replace your local agriculture office"];
const faqs = [
  { q: "Does Fieldnote upload my photos?", a: "No. Photos are reduced in size and stored only in this browser on this device. Clearing your browser data or using “Clear saved photos” removes them." },
  { q: "Why doesn’t it tell me which disease it is?", a: "This version has no disease-detection model. Guessing from a photo can be wrong and lead to the wrong treatment, so Fieldnote helps you observe carefully and talk to an expert instead." },
  { q: "Does it work without internet?", a: "Yes. Once the published app has loaded once, the guides, notes and replies keep working offline." },
  { q: "Can I use it on more than one phone?", a: "Notes stay on the device where you saved them. Syncing between devices isn’t available yet." },
  { q: "Which crops are covered?", a: "Chilli and rice today, with common diseases and pests for each. More crops can be added later." },
];

export function AboutPage() {
  return (
    <div className={cn(pageEnter, "mx-auto max-w-4xl space-y-10")}>
      <PageHeader eyebrow="About Fieldnote" title="Small observations. Better conversations." description="Fieldnote is a pocket notebook and field guide for chilli and rice farmers — private, offline, and honest about what it can and can’t do." />

      <section>
        <Eyebrow>How it works</Eyebrow>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className={cn(cardClass, "p-5")}>
              <div className="flex items-center justify-between"><IconBadge><Icon className="size-[18px]" /></IconBadge><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span></div>
              <strong className="mt-4 block text-lg font-semibold">{title}</strong>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-lg font-semibold">What it can do</h2>
          <ul className="mt-3 space-y-2.5">{can.map((item) => <li key={item} className="flex gap-2.5 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {item}</li>)}</ul>
        </div>
        <div className={cn(cardClass, "p-5")}>
          <h2 className="text-lg font-semibold">What it won’t do</h2>
          <ul className="mt-3 space-y-2.5">{cannot.map((item) => <li key={item} className="flex gap-2.5 text-[15px] text-muted-foreground"><X className="mt-0.5 size-4 shrink-0 text-coral" /> {item}</li>)}</ul>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-5"><ShieldCheck className="size-5 shrink-0 text-primary" /><p className="text-[15px] leading-relaxed"><strong>Private by design.</strong> No account, no uploads, no tracking of your field.</p></div>
        <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-5"><WifiOff className="size-5 shrink-0 text-primary" /><p className="text-[15px] leading-relaxed"><strong>Built for low signal.</strong> Everything you need is kept on the device.</p></div>
      </section>

      <section>
        <Eyebrow>Questions</Eyebrow>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Good to know</h2>
        <Accordion type="single" collapsible className={cn(cardClass, "mt-4 px-4 sm:px-6")}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q} className="border-line last:border-b-0">
              <AccordionTrigger className="min-h-14 text-left text-[15px] font-medium">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className={cn(cardClass, "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between")}>
        <div><h2 className="text-lg font-semibold">Ready for a field walk?</h2><p className="text-sm text-muted-foreground">Start with one photo and one note.</p></div>
        <Button asChild className="h-12 rounded-xl px-5 text-[15px] font-semibold"><Link to="/check"><Camera /> Start a crop check <ArrowRight /></Link></Button>
      </section>
    </div>
  );
}
