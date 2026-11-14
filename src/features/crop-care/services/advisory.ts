import { getTopic, l, topics, type CropKey, type Topic } from "../knowledge";
import type { Lang } from "../i18n";
import { verifiedDistricts } from "../regions";
import type { Season } from "./types";

// ---------- AdvisoryService ----------
export type ChemicalRecord = {
  product: string;
  activeIngredient: string;
  dose: string;
  method: string;
  waitingPeriodDays: number;
  precautions: string[];
  reference: string;
};

export type Advisory = {
  topic: Topic;
  /** Only ever filled from CIB&RC-verified, crop/problem/region-specific records. Never generated. */
  chemical: ChemicalRecord[];
  source: { organisation: string; reference: string; region: string; season: string; verified: boolean };
};

export const safetyPrecautions = [
  "Read and follow the product label exactly if any treatment is recommended to you.",
  "Wear gloves, a mask and full-sleeved clothing when handling any crop-protection product.",
  "Keep children and animals away; never eat, drink or smoke while spraying.",
  "Respect the waiting period on the label before harvest.",
  "Wash hands and clothes after work in a treated field.",
];

export function getAdvisory(crop: CropKey, slug: string, region: { district: string; season: Season }): Advisory | undefined {
  const topic = getTopic(crop, slug);
  if (!topic) return undefined;
  const verified = verifiedDistricts.includes(region.district);
  return {
    topic,
    chemical: [],
    source: {
      organisation: verified ? "Verified regional record" : "Not yet matched to ICAR / ANGRAU / PJTSAU records",
      reference: "Prototype guidance written for this app",
      region: verified ? region.district : `No verified record for ${region.district || "your district"}`,
      season: region.season === "kharif" ? "Kharif (general)" : "Rabi (general)",
      verified,
    },
  };
}

// ---------- AssistantService ----------
export type AssistantContext = { crop?: CropKey; slug?: string; confidence?: number; severityBand?: string; sample?: boolean };
export type AssistantReply = { text: string; refs: { crop: CropKey; slug: string }[]; safety: boolean };

const chemicalWords = ["dose", "dosage", "spray", "pesticide", "insecticide", "fungicide", "chemical", "ml", "litre", "liter", "gram", "kitna", "कितना", "दवा", "छिड़काव", "మందు", "పిచికారీ", "మోతాదు"];

const templates: Record<Lang, { safety: string; noMatch: string; intro: (name: string) => string; first: string; prevent: string; help: string; sample: string; officer: string }> = {
  en: {
    safety: "I can't suggest pesticide names, doses or waiting periods. Those must come only from CIB&RC-verified records for your crop and region, and none are installed in this app yet. Please ask your local agricultural officer or Krishi Vigyan Kendra.",
    noMatch: "I couldn't match that to a rice or chilli problem in the built-in guide. Try naming the crop and what you see — for example “brown spots on rice leaves” or “chilli leaves curling up”.",
    intro: (name) => `From the built-in guide on ${name}:`,
    first: "What to do first:", prevent: "To prevent it:", help: "When to get help:",
    sample: "Note: the diagnosis you're asking about is a sample result, not an analysis of your photo.",
    officer: "Contact your agricultural officer or Krishi Vigyan Kendra if symptoms spread, if you're unsure, or before using any chemical treatment.",
  },
  hi: {
    safety: "मैं कीटनाशक के नाम, मात्रा या प्रतीक्षा अवधि नहीं बता सकता। ये केवल आपकी फ़सल और क्षेत्र के CIB&RC-सत्यापित रिकॉर्ड से आने चाहिए, और अभी इस ऐप में कोई इंस्टॉल नहीं है। कृपया अपने स्थानीय कृषि अधिकारी या कृषि विज्ञान केंद्र से पूछें।",
    noMatch: "मैं इसे गाइड में धान या मिर्च की किसी समस्या से नहीं मिला सका। फ़सल का नाम और जो दिख रहा है वह लिखें — जैसे “धान की पत्ती पर भूरे धब्बे”।",
    intro: (name) => `गाइड से — ${name}:`,
    first: "पहले क्या करें:", prevent: "रोकथाम:", help: "मदद कब लें:",
    sample: "ध्यान दें: जिस परिणाम के बारे में आप पूछ रहे हैं वह नमूना है, आपकी फ़ोटो की जाँच नहीं।",
    officer: "लक्षण फैलें, संदेह हो, या कोई रासायनिक उपचार करने से पहले अपने कृषि अधिकारी या कृषि विज्ञान केंद्र से संपर्क करें।",
  },
  te: {
    safety: "పురుగుమందుల పేర్లు, మోతాదులు లేదా నిరీక్షణ కాలం నేను సూచించలేను. అవి మీ పంట, ప్రాంతానికి CIB&RC-ధృవీకరించిన రికార్డుల నుండి మాత్రమే రావాలి; ఇంకా ఈ యాప్‌లో ఏవీ లేవు. దయచేసి మీ స్థానిక వ్యవసాయ అధికారిని లేదా కృషి విజ్ఞాన కేంద్రాన్ని అడగండి.",
    noMatch: "దీన్ని గైడ్‌లోని వరి లేదా మిరప సమస్యతో సరిపోల్చలేకపోయాను. పంట పేరు, కనిపిస్తున్నది రాయండి — ఉదా. “వరి ఆకులపై గోధుమ మచ్చలు”.",
    intro: (name) => `గైడ్ నుండి — ${name}:`,
    first: "ముందుగా ఏమి చేయాలి:", prevent: "నివారణ:", help: "సహాయం ఎప్పుడు తీసుకోవాలి:",
    sample: "గమనిక: మీరు అడుగుతున్న ఫలితం నమూనా మాత్రమే, మీ ఫోటో విశ్లేషణ కాదు.",
    officer: "లక్షణాలు వ్యాపిస్తే, సందేహం ఉంటే, లేదా రసాయన చికిత్సకు ముందు మీ వ్యవసాయ అధికారిని లేదా కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
  },
};

const keywordMap: { words: string[]; slug: string; crop: CropKey }[] = [
  { words: ["blast", "eye", "neck", "ब्लास्ट", "झोंका", "అగ్గి"], crop: "rice", slug: "rice-blast" },
  { words: ["brown spot", "brown", "rust", "भूरा", "గోధుమ"], crop: "rice", slug: "brown-spot" },
  { words: ["blight", "tip dry", "kresek", "झुलसा", "ఎండు"], crop: "rice", slug: "bacterial-leaf-blight" },
  { words: ["tungro", "orange", "stunt", "टुंग्रो", "టుంగ్రో"], crop: "rice", slug: "tungro" },
  { words: ["planthopper", "hopper", "hopperburn", "फुदका", "సుడి"], crop: "rice", slug: "brown-planthopper" },
  { words: ["stem borer", "borer", "dead heart", "white ear", "तना", "కాండం"], crop: "rice", slug: "yellow-stem-borer" },
  { words: ["folder", "folded", "लपेटक", "ముడత పురుగు"], crop: "rice", slug: "leaf-folder" },
  { words: ["gall", "onion", "silver shoot", "ఉల్లికోడు"], crop: "rice", slug: "gall-midge" },
  { words: ["curl", "murda", "pucker", "मरोड़", "ముడత"], crop: "chilli", slug: "leaf-curl" },
  { words: ["cercospora", "frog", "सर्कोस्पोरा"], crop: "chilli", slug: "cercospora-leaf-spot" },
  { words: ["bacterial spot", "scab", "greasy"], crop: "chilli", slug: "bacterial-leaf-spot" },
  { words: ["powder", "mildew", "white powder", "चूर्णिल", "బూడిద"], crop: "chilli", slug: "powdery-mildew" },
  { words: ["anthracnose", "fruit rot", "die-back", "dieback", "sunken", "सड़न", "కుళ్ళు"], crop: "chilli", slug: "anthracnose" },
  { words: ["thrips", "silver", "थ्रिप्स", "తామర"], crop: "chilli", slug: "thrips" },
  { words: ["mite", "bronze", "माइट", "నల్లి"], crop: "chilli", slug: "mites" },
  { words: ["whitefly", "white fly", "सफ़ेद मक्खी", "తెల్ల దోమ"], crop: "chilli", slug: "whitefly" },
  { words: ["aphid", "honeydew", "sticky", "माहू", "పేను"], crop: "chilli", slug: "aphids" },
];

export function findTopicForQuestion(question: string, ctx: AssistantContext): Topic | undefined {
  const q = question.toLowerCase();
  const mentionsRice = /rice|paddy|धान|వరి/.test(q);
  const mentionsChilli = /chill?i|mirch|मिर्च|మిరప/.test(q);
  const crop: CropKey | undefined = mentionsRice ? "rice" : mentionsChilli ? "chilli" : ctx.crop;
  const hit = keywordMap.find((entry) => entry.words.some((w) => q.includes(w)) && (!crop || entry.crop === crop))
    ?? keywordMap.find((entry) => entry.words.some((w) => q.includes(w)));
  if (hit) return getTopic(hit.crop, hit.slug);
  if (ctx.crop && ctx.slug) return getTopic(ctx.crop, ctx.slug);
  if (/yellow|पीला|పసుపు/.test(q) && crop === "chilli") return getTopic("chilli", "leaf-curl");
  if (/leaf|spot|पत्ती|ఆకు/.test(q) && crop === "rice") return getTopic("rice", "brown-spot");
  return undefined;
}

export function assistantReply(question: string, ctx: AssistantContext, lang: Lang): AssistantReply {
  const tpl = templates[lang];
  const q = question.toLowerCase();
  if (chemicalWords.some((w) => q.includes(w))) return { text: tpl.safety, refs: [], safety: true };
  const topic = findTopicForQuestion(question, ctx);
  if (!topic) return { text: tpl.noMatch, refs: [], safety: false };
  const wantsPrevent = /prevent|stop|spread|avoid|रोक|నివార/.test(q);
  const wantsHelp = /officer|expert|contact|when|serious|अधिकारी|అధికారి/.test(q);
  const lines = [tpl.intro(l(lang, topic.name)), l(lang, topic.summary), ""];
  if (wantsPrevent) {
    lines.push(tpl.prevent, ...topic.prevention.map((p) => `• ${p.title}: ${p.body}`));
  } else {
    lines.push(tpl.first, ...topic.immediate.slice(0, 4).map((s) => `• ${s}`));
  }
  lines.push("", tpl.help, wantsHelp ? tpl.officer : topic.getHelp);
  if (ctx.sample && ctx.slug === topic.slug) lines.push("", tpl.sample);
  return { text: lines.join("\n"), refs: [{ crop: topic.crop, slug: topic.slug }], safety: false };
}

export const suggestedQuestions: Record<Lang, string[]> = {
  en: ["Why is my rice leaf turning brown?", "How serious is this disease?", "What should I do first?", "How can I prevent it from spreading?", "What precautions should I take?", "When should I contact an agricultural officer?"],
  hi: ["मेरी धान की पत्ती भूरी क्यों हो रही है?", "यह रोग कितना गंभीर है?", "पहले क्या करूँ?", "इसे फैलने से कैसे रोकूँ?", "क्या सावधानियाँ रखूँ?", "कृषि अधिकारी से कब संपर्क करूँ?"],
  te: ["నా వరి ఆకు ఎందుకు గోధుమ రంగుకు మారుతోంది?", "ఈ వ్యాధి ఎంత తీవ్రమైనది?", "ముందుగా ఏమి చేయాలి?", "ఇది వ్యాపించకుండా ఎలా ఆపాలి?", "ఏ జాగ్రత్తలు తీసుకోవాలి?", "వ్యవసాయ అధికారిని ఎప్పుడు సంప్రదించాలి?"],
};

export const allTopicCount = topics.length;
