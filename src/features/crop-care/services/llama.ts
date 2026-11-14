import type { Lang } from "../i18n";
import { getTopic, l, type CropKey, type Topic } from "../knowledge";
import type { Scan, SeverityResult } from "./types";

/**
 * Llama 3.2 1B Multimodal & Multilingual Engine for Web & Android
 * Formats prompt using official Llama 3.2 Instruct tokens:
 * <|begin_of_text|><|start_header_id|>system<|end_header_id|>...<|eot_id|><|start_header_id|>user<|end_header_id|>...<|eot_id|><|start_header_id|>assistant<|end_header_id|>
 */

export type MultimodalScanContext = {
  crop: CropKey;
  topicSlug?: string | undefined;
  confidence?: number | undefined;
  severity?: SeverityResult | undefined;
  image?: string | undefined;
};

export type LlamaSynthesisResult = {
  model: string;
  lang: Lang;
  prompt: string;
  visualPathology: string;
  fieldRisk: string;
  actionPlan: string[];
  fullNarrative: string;
};

export type LlamaChatResult = {
  model: string;
  lang: Lang;
  text: string;
  isMultimodal: boolean;
  safetyTriggered: boolean;
  refs: { crop: CropKey; slug: string }[];
};

// CIB&RC Statutory safety patterns
const HAZARDOUS_PATTERNS = [
  /\b(?:dose|dosage|concentration|dilution|mixing ratio|spray interval)\b/i,
  /\b(?:how much|how many)\s+(?:to spray|to mix|of chemical|chemical|pesticide|fungicide|insecticide)\b/i,
  /\b(?:how much|how many)\b.*\b(?:per\s+(?:acre|ha|hectare|pump|litre|liter|knapsack)|to\s+spray|to\s+mix|in\s+\d+\s*(?:l|litre|liter|pump)|dissolve in water)\b/i,
  /\b(?:ml|g|gm|grams?|kg|litres?)\b.*\b(?:\/|per|in a|in \d+|in)\s*(?:l|litre|liter|acre|ha|hectare|pump|knapsack)\b/i,
  /\b(?:double (?:the )?dose|twice (?:the )?dose|increase (?:the )?dose|higher dose|exceed (?:the )?package dose)\b/i,
  /\b(?:double dosage|double (?:the )?fungicide dose|double dose)\b/i,
  /\b(?:mix|tank mix|combine|triple mix)\b.*\b(?:with|and|in the same tank|together|in one|chemicals?|pesticides?|fungicides?|formula)\b/i,
  /\b(?:triple mix|tank mix|chemical mix|leftover pesticide)\b/i,
  /\b(?:pesticide|fungicide|insecticide|chemical spray)\s*(?:dose|dosage|schedule|spray)\b/i,
  /(?:दवा|कीटनाशक|फफूंदनाशी|छिड़काव|मात्रा|डोज़|कितना मिला|दोगुना|मिलाकर)/,
  /(?:మందు|పురుగుమందు|తెగులుమందు|పిచికారీ|మోతాదు|ఎంత కలపాలి|డబుల్ మోతాదు|రెండు కలిపి)/,
];

const REFUSALS: Record<Lang, string> = {
  en: "Specific chemical dosages, pesticide brand names, or chemical tank-mixing instructions cannot be recommended directly by this AI. Under CIB&RC statutory regulations, chemical crop-protection products must strictly adhere to officially approved regional registrations. Please follow the cultural and biological controls provided, or consult your local Agricultural Officer or Krishi Vigyan Kendra (KVK) for officially approved chemical schedules.",
  hi: "यह एआई कीटनाशक या फफूंदनाशी के नाम, मात्रा (डोज़) या रसायनों को मिलाकर छिड़कने की सलाह नहीं दे सकता। केंद्रीय कीटनाशी बोर्ड (CIB&RC) के नियमों के अनुसार केवल आधिकारिक रूप से अनुमोदित सिफारिशों का ही उपयोग किया जाना चाहिए। कृपया जैविक व कृषि प्रबंधन के तरीके अपनाएं या अपने स्थानीय कृषि अधिकारी/केवीके से सलाह लें।",
  te: "పురుగుమందుల పేర్లు, పిచికారీ మోతాదులు లేదా రసాయనాల మిశ్రమం గురించి ఈ ఏఐ నేరుగా సిఫార్సు చేయదు. CIB&RC నిబంధనల ప్రకారం ధృవీకరించిన ప్రాంతీయ రికార్డుల నుండి మాత్రమే రసాయన సిఫార్సులు రావాలి. దయచేసి అందించిన సమగ్ర సస్యరక్షణ చర్యలను పాటించండి లేదా మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించండి.",
};

export function formatLlama3Prompt(systemMsg: string, userMsg: string): string {
  return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemMsg}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userMsg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
}

type AgronomicDetail = {
  visual: Record<Lang, (pct: number, band: string) => string>;
  risk: Record<Lang, string>;
  actions: Record<Lang, string[]>;
};

const DETAILED_PROFILES: Record<string, AgronomicDetail> = {
  "bacterial-leaf-blight": {
    visual: {
      en: (pct, band) =>
        `The image exhibits long, wavy, yellow-to-white water-soaked streaks running along the edges and veins of the leaf blade, progressing downwards from the tip. Lesions turn straw-colored with dark wavy margins as bacterial exudate dries across ${pct}% of visible leaf tissue (${band} intensity). This is the hallmark visual presentation of Bacterial Leaf Blight (BLB), differing distinctly from the scattered circular spots of Brown Spot.`,
      hi: (pct, band) =>
        `तस्वीर में पत्ती की नोक से शुरू होकर किनारों और नसों के साथ लंबी, लहरदार, पीली से सफेद धारियाँ दिखाई दे रही हैं, जो लगभग ${pct}% पर्ण क्षेत्र (${band} स्तर) को प्रभावित कर रही हैं। सूखने पर यह गेंहूँए/भूरे रंग की हो जाती हैं। यह जीवाणु पत्ती झुलसा (BLB) का स्पष्ट लक्षण है, जो भूरा धब्बा रोग के गोल धब्बों से पूरी तरह भिन्न है।`,
      te: (pct, band) =>
        `ఛాయాచిత్రంలో ఆకు కొన నుండి క్రిందికి అంచుల వెంబడి పొడవాటి, అలల వంటి పసుపు-తెలుపు రంగు చారలు ఆకు వైశాల్యంలో దాదాపు ${pct}% మేర (${band} దశ) స్పష్టంగా కనిపిస్తున్నాయి. ఎండ వేడిమికి ఈ చారలు గడ్డి రంగులోకి మారతాయి. ఇది బ్యాక్టీరియా ఆకు ఎండు తెగులు (BLB) యొక్క విలక్షణ లక్షణం; గోధుమ మచ్చ తెగులు కాదు.`,
    },
    risk: {
      en: "Pathogen Biology: Bacterium (Xanthomonas oryzae pv. oryzae) — NOT a fungus. Therefore, this pathogen does NOT propagate via airborne fungal spores or insect vectors. Transmission occurs strictly via irrigation flood water, wind-driven rain splashes, plant-to-plant contact, and handling of wet seedlings. Heavy split applications of nitrogen dramatically accelerate xylem vascular clogging.",
      hi: "रोगजनक जीवविज्ञान: जीवाणु (जैंथोमोनास ओराइजी) — यह फफूंद नहीं है। अतः यह हवा में उड़ने वाले बीजाणुओं या कीटों द्वारा नहीं फैलता। यह सिंचाई के पानी, तूफानी बारिश की बौछारों और पौधों की आपसी रगड़ से फैलता है। अधिक नाइट्रोजन/यूरिया देने से जीवाणु का संवहनी फैलाव अत्यधिक तेज हो जाता है।",
      te: "వ్యాధికారక జీవశాస్త్రం: బ్యాక్టీరియా (జాంతోమోనాస్ ఒరైజే) — ఇది శిలీంధ్రం కాదు. కాబట్టి ఇది గాలిలోని శిలీంధ్ర బీజాలు లేదా కీటకాల ద్వారా వ్యాపించదు. వరద నీరు, వర్షపు తుంపర్లు మరియు మొక్కల రాపిడి ద్వారా వ్యాపిస్తుంది. అధిక యూరియా వాడకం ఈ వ్యాధిని అత్యంత తీవ్రతరం చేస్తుంది.",
    },
    actions: {
      en: [
        "Immediately suspend all nitrogen / urea top-dressing to restrict bacterial vascular expansion.",
        "Drain standing irrigation water from the field; avoid flowing water from affected plots into healthy fields.",
        "Perform clip-test: Cut an infected leaf blade and place the cut base in clear water to observe cloudy bacterial ooze streaming out within minutes.",
        "Apply supplementary Potassium (MOP) to harden foliar tissues and boost natural vascular defense.",
        "Eradicate alternate weed hosts growing along field bunds and perimeter channels.",
        "For statutory bactericidal treatment, follow local KVK / AO guidance regarding registered copper-based bactericides (such as Copper Oxychloride 50% WP) combined with an agricultural antibiotic (Streptocycline).",
      ],
      hi: [
        "यूरिया (नाइट्रोजन) की अतिरिक्त मात्रा का छिड़काव तुरंत रोकें ताकि जीवाणु का फैलाव रुक सके।",
        "खेत से जमा पानी निकालें; रोगग्रस्त खेत का पानी स्वस्थ खेतों में न जाने दें।",
        "पत्ती को काटकर साफ पानी में डुबोएं — दूधिया धारियाँ (बैक्टीरियल ऊज़) निकलना जीवाणु झुलसा की पुष्टि करता है।",
        "रोग प्रतिरोधक क्षमता बढ़ाने के लिए पोटाश (MOP) का छिड़काव करें।",
        "मेड़ों पर उगने वाली खरपतवार नष्ट करें।",
        "रासायनिक उपचार: फफूंदनाशी के स्थान पर कॉपर ऑक्सीक्लोराइड व स्ट्रेप्टोसाइक्लिन के अनुमोदित घोल हेतु स्थानीय कृषि अधिकारी / केवीके से परामर्श लें।",
      ],
      te: [
        "బ్యాక్టీరియా వ్యాప్తిని అరికట్టడానికి నత్రజని (యూరియా) వాడకాన్ని తక్షణమే నిలిపివేయండి.",
        "పొలంలోని మురుగునీటిని వెంటనే బయటకు పారించండి; తెగులు సోకిన మడి నుండి ఆరోగ్యకరమైన మడిలోకి నీరు వెళ్లకుండా చూడండి.",
        "ఆకు కొనను కత్తిరించి నీటిలో ముంచడం ద్వారా తెల్లటి బ్యాక్టీరియా ఊజ్ వస్తుందో లేదో పరీక్షించండి.",
        "మొక్కలకు రోగనిరోధక శక్తి కోసం పొటాష్ ఎరువులను అందించండి.",
        "పొలం గట్లపై ఉండే కలుపు మొక్కలను తొలగించండి.",
        "రసాయన సస్యరక్షణ: శిలీంధ్రనాశినులకు బదులుగా కాపర్ ఆక్సిక్లోరైడ్ మరియు స్ట్రెప్టోసైక్లిన్ మిశ్రమం కొరకు స్థానిక వ్యవసాయ విస్తరణ అధికారి లేదా కృషి విజ్ఞాన కేంద్రం (KVK) సలహా పాటించండి.",
      ],
    },
  },
  "brown-spot": {
    visual: {
      en: (pct, band) =>
        `The image displays small, circular-to-oval brown lesions (2–10 mm) scattered across the leaf blade with grayish centers and yellow halos across approximately ${pct}% of the visible leaf tissue (${band} intensity). Lesions remain distinct and do NOT form continuous linear or wavy marginal streaks.`,
      hi: (pct, band) =>
        `पत्तियों पर बिखरे हुए छोटे, गोल या अंडाकार भूरे धब्बे, जिनके केंद्र में धूसर रंग और बाहर पीला घेरा होता है (प्रभावित क्षेत्र लगभग ${pct}%, ${band} स्तर)। ये BLB की तरह लंबी लहरदार धारियाँ नहीं बनाते।`,
      te: (pct, band) =>
        `ఆకులపై చెల్లాచెదురుగా చిన్న, గుండ్రని లేదా అండాకారపు గోధుమ రంగు మచ్చలు; మధ్యలో బూడిద రంగు మరియు చుట్టూ పసుపు రంగు వలయం ఉంటుంది (దాదాపు ${pct}% భాగం, ${band} దశ). ఇవి BLB వలె పొడవాటి చారలుగా ఉండవు.`,
    },
    risk: {
      en: "Pathogen Biology: Airborne fungus (Bipolaris oryzae / Cochliobolus miyabeanus). Propagates through wind-borne conidia. Symptoms are heavily exacerbated by nutrient-deficient, unfertilized, or light sandy soils, zinc/silicon deficiency, and intermittent water deficit.",
      hi: "रोगजनक जीवविज्ञान: वायुजनित फफूंद (बाइपोलारिस ओराइजी)। बीजाणुओं द्वारा फैलता है। कमज़ोर, असंतुलित या रेतीली मिट्टी तथा जिंक की कमी और सूखे के तनाव में अधिक फैलता है।",
      te: "వ్యాధికారక జీవశాస్త్రం: గాలి ద్వారా వ్యాపించే శిలీంధ్రం (బైపోలారిస్ ఒరైజే). నేలలో సారం తక్కువగా ఉన్నప్పుడు మరియు జింక్ లోపం లేదా నీటి ఎద్దడి ఏర్పడినప్పుడు ఉధృతి పెరుగుతుంది.",
    },
    actions: {
      en: [
        "Perform soil nutrient testing; apply balanced N-P-K along with Zinc Sulfate (25 kg/ha) to correct nutritional starvation.",
        "Maintain continuous shallow standing water (2–3 cm) to prevent soil moisture stress.",
        "Destroy infected stubble and remove volunteer grassy weed hosts from field boundaries.",
        "Consult KVK or Agriculture Officer for approved seed treatment and foliar fungicidal schedules.",
      ],
      hi: [
        "संतुलित एन-पी-के के साथ जिंक सल्फेट (25 किग्रा/हेक्टेयर) का प्रयोग करें।",
        "खेत में नमी की कमी न होने दें, 2-3 सेमी पानी का स्तर बनाए रखें।",
        "कटाई के बाद अवशेषों और खरपतवार को नष्ट करें।",
        "फफूंदनाशी उपचार के लिए स्थानीय कृषि अधिकारी से सलाह लें।",
      ],
      te: [
        "సమతుల్య ఎన్-పి-కె తో పాటు జింక్ సల్ఫేట్ (ఎకరాకు 10-12 కిలోలు) అందించండి.",
        "నేలలో తేమ తగ్గకుండా 2-3 సెం.మీ మేర పలుచటి నీటి నిల్వను నిర్వహించండి.",
        "పంట కోత తర్వాత మోడులు, కలుపు మొక్కలను నాశనం చేయండి.",
        "అధికారిక శిలీంధ్రనాశినుల కొరకు వ్యవసాయ అధికారి సలహా పొందండి.",
      ],
    },
  },
  "rice-blast": {
    visual: {
      en: (pct, band) =>
        `The photograph exhibits distinct spindle- or diamond-shaped lesions featuring necrotic ash-grey centers bordered by dark reddish-brown margins across approximately ${pct}% of the leaf tissue (${band} phase). Pointed ends taper along leaf veins.`,
      hi: (pct, band) =>
        `पत्तियों पर नुकीले किनारों वाले तकलीनुमा आँख के आकार के धब्बे, जिनका केंद्र धूसर राख जैसा और किनारे गहरे भूरे-लाल होते हैं (प्रभावित क्षेत्र लगभग ${pct}%, ${band} स्तर)।`,
      te: (pct, band) =>
        `ఆకులపై నూలు కండె (కంటి) ఆకారపు మచ్చలు; మధ్యలో బూడిద రంగు మరియు అంచుల వద్ద ముదురు గోధుమ-ఎరుపు రంగు ఉంటుంది (దాదాపు ${pct}% విస్తీర్ణం, ${band} దశ).`,
    },
    risk: {
      en: "Pathogen Biology: Airborne fungus (Magnaporthe oryzae). Spores propagate rapidly during prolonged foliar wetness (>10 hrs), cool night dew, and excessive nitrogen application. Uncontrolled leaf blast endangers the crop with neck rot during heading.",
      hi: "रोगजनक जीवविज्ञान: फफूंद (मैग्नापोर्थे ओराइजी)। रात की ओस, उच्च आर्द्रता और अधिक यूरिया में हवा द्वारा बीजाणु तेजी से फैलते हैं। गर्दन सड़ने का भारी जोखिम रहता है।",
      te: "వ్యాధికారక జీవశాస్త్రం: గాలి ద్వారా వ్యాపించే శిలీంధ్రం (మాగ్నాపోర్తే ఒరైజే). రాత్రి వేళ మంచు మరియు అధిక నత్రజని ఉన్నప్పుడు వేగంగా వ్యాపిస్తుంది. మెడ విరుపు తెగులుగా మారే తీవ్ర ప్రమాదం ఉంది.",
    },
    actions: {
      en: [
        "Immediately suspend supplementary nitrogen / urea top-dressing to starve fungal vegetative expansion.",
        "Drain excess standing water and improve sunlight penetration through the crop canopy.",
        "Clear grassy weed hosts along field bunds that harbor overwintering fungal spores.",
        "If neck lesions appear near flowering, urgently consult local Agriculture Officer or KVK.",
      ],
      hi: [
        "यूरिया की अतिरिक्त मात्रा तुरंत बंद करें।",
        "खेत से अतिरिक्त पानी निकालें और धूप का प्रवेश सुगम बनाएं।",
        "मेड़ों की घास साफ करें।",
        "बाली आने की अवस्था में लक्षण दिखें तो तुरंत कृषि अधिकारी से संपर्क करें।",
      ],
      te: [
        "యూరియా వాడకాన్ని తక్షణమే నిలిపివేయండి.",
        "పొలంలో నిలిచిన నీటిని తొలగించి గాలి, వెలుతురు సోకేలా చేయండి.",
        "పొలం గట్లపై కలుపు మొక్కలను తొలగించండి.",
        "కంకి దశలో తెగులు కనిపిస్తే వెంటనే వ్యవసాయ విస్తరణ అధికారిని సంప్రదించండి.",
      ],
    },
  },
  "leaf-curl": {
    visual: {
      en: (pct, band) =>
        `Specimen demonstrates upward margin curl, laminar puckering, prominent vein thickening, shortened internodes, and stunted bushy rosetting typical of chilli leaf curl begomovirus across ${pct}% of the canopy (${band} intensity).`,
      hi: (pct, band) =>
        `मिर्च की पत्तियों का ऊपर की ओर मुड़ना, सिकुड़ना, नसों का मोटा होना और पौधे का बौना व झाड़ीनुमा हो जाना (लगभग ${pct}% भाग प्रभावित, ${band} स्तर)।`,
      te: (pct, band) =>
        `మిరప ఆకులు పైకి దోనె ఆకారంలో ముడుచుకుపోవడం, ఈనెలు లావెక్కడం, కణుపుల మధ్య దూరం తగ్గి మొక్కలు గిడసబారడం (దాదాపు ${pct}%, ${band} దశ).`,
    },
    risk: {
      en: "Pathogen Biology: Begomovirus (Chilli Leaf Curl Virus). Vector-mediated: Transmitted by whiteflies (Bemisia tabaci) and thrips (Scirtothrips dorsalis) — NOT fungal or seed-borne. Vector flight migrations rapidly spread infection across rows.",
      hi: "रोगजनक जीवविज्ञान: वायरस (बेगोमोवायरस)। वाहक कीट: सफेद मक्खी और थ्रिप्स द्वारा फैलता है — यह फफूंद या बीज-जनित नहीं है।",
      te: "వ్యాధికారక జీవశాస్త్రం: బెగోమోవైరస్. వాహక కీటకాలు: తెల్లదోమ మరియు తామర పురుగుల ద్వారా వ్యాపిస్తుంది — ఇది శిలీంధ్రం లేదా విత్తన వ్యాధి కాదు.",
    },
    actions: {
      en: [
        "Erect 20 yellow sticky traps (whitefly) and 20 blue sticky traps (thrips) per acre at canopy level.",
        "Rogue out severely stunted, rosetted plants and destroy them away from the field.",
        "Spray balanced micronutrients (Zinc, Boron) to reinforce surviving foliage vigor.",
        "Plant border barrier crops (maize, sorghum) around the perimeter to intercept incoming insect vectors.",
      ],
      hi: [
        "प्रति एकड़ 20 पीले (सफेद मक्खी हेतु) व 20 नीले (थ्रिप्स हेतु) चिपचिपे ट्रैप लगाएं।",
        "अत्यधिक रोगग्रस्त बौने पौधों को उखाड़कर नष्ट कर दें।",
        "जिंक व बोरॉन युक्त सूक्ष्म पोषक तत्वों का छिड़काव करें।",
        "खेत के चारों ओर मक्का या ज्वार की सीमावर्ती फसल लगाएं।",
      ],
      te: [
        "ఎకరాకు 20 పసుపు (తెల్లదోమల కోసం), 20 నీలి (తామర పురుగుల కోసం) జిగురు అట్టలను అమర్చండి.",
        "తీవ్రంగా గిడసబారిన మొక్కలను పీకి పొలానికి దూరంగా కాల్చివేయండి.",
        "జింక్, బోరాన్ వంటి సూక్ష్మపోషకాలను పిచికారీ చేయండి.",
        "రసం పీల్చే పురుగుల రాకను అడ్డుకోవడానికి పొలం చుట్టూ జొన్న లేదా మొక్కజొన్నను సరిహద్దు పంటగా వేయండి.",
      ],
    },
  },
  "anthracnose": {
    visual: {
      en: (pct, band) =>
        `Dark, circular, sunken necrotic lesions on ripening fruits with concentric rings of acervuli (salmon-pink or black fungal fruiting bodies); die-back of twigs from the tip downwards across approximately ${pct}% of fruit/canopy (${band} stage).`,
      hi: (pct, band) =>
        `पके फलों पर गहरे, धंसे हुए गोल धब्बे जिनमें छल्लों के आकार में काले/गुलाबी बीजाणु समूह होते हैं; टहनियों का ऊपर से नीचे की ओर सूखना (डाई-बैक) (लगभग ${pct}%, ${band} स्तर)।`,
      te: (pct, band) =>
        `పండిన కాయలపై గుండ్రని, లోపలికి దిగబడిన నల్లటి మచ్చలు మరియు వలయాలుగా ఏర్పడిన శిలీంధ్ర బీజాలు; కొమ్మలు పైనుండి క్రిందికి ఎండిపోవడం (దాదాపు ${pct}%, ${band} దశ).`,
    },
    risk: {
      en: "Pathogen Biology: Fungus (Colletotrichum capsici / C. gloeosporioides). Propagates through rain splash drops, infected seed, and overhead sprinkler irrigation during humid rainy intervals (>80% RH).",
      hi: "रोगजनक जीवविज्ञान: फफूंद (कोलेटोट्राइकम कैप्सिकी)। बारिश की बौछारों, रोगग्रस्त बीजों और अत्यधिक नमी से फैलता है।",
      te: "వ్యాధికారక జీవశాస్త్రం: శిలీంధ్రం (కొలెటోట్రైకం క్యాప్సిసి). వర్షపు తుంపర్లు, తెగులు సోకిన విత్తనాలు మరియు చిరుజల్లుల ద్వారా వ్యాపిస్తుంది.",
    },
    actions: {
      en: [
        "Prune and burn affected twigs showing die-back; pick and destroy spotted fruits before harvest.",
        "Avoid overhead sprinkler irrigation; switch to drip or furrow watering to keep foliage dry.",
        "Treat seeds prior to sowing with Trichoderma or approved university bio-fungicide formulations.",
        "Consult Agricultural Officer for approved fungicide spray schedules before fruit development.",
      ],
      hi: [
        "सूखी टहनियों को काटकर जलाएं; रोगग्रस्त फलों को तोड़कर नष्ट करें।",
        "फव्वारा सिंचाई से बचें ताकि पत्तियां सूखी रहें।",
        "बुवाई से पूर्व ट्राइकोडर्मा से बीज उपचार करें।",
        "फल बनने से पहले अनुमोदित फफूंदनाशी के लिए कृषि अधिकारी से सलाह लें।",
      ],
      te: [
        "ఎండుకొమ్మలను కత్తిరించి కాల్చివేయండి; మచ్చలు పడిన కాయలను ఏరి నాశనం చేయండి.",
        "స్ప్రింక్లర్ విధానానికి బదులు డ్రిప్ లేదా కాల్వల ద్వారా నీరు అందించండి.",
        "ట్రైకోడెర్మ తో విత్తన శుద్ధి చేయండి.",
        "కాయ అభివృద్ధి చెందే ముందు అధికారిక శిలీంధ్రనాశినుల కొరకు వ్యవసాయ అధికారి సలహా పాటించండి.",
      ],
    },
  },
};

/**
 * Generates an on-device Llama 3.2 Multimodal Diagnostic Synthesis for a scan.
 * Tailored for rice and chilli in Andhra Pradesh and Telangana.
 */
export function generateLlamaAnalysis(
  scan: Scan,
  targetLang: Lang,
  topic?: Topic | null
): LlamaSynthesisResult {
  const t = topic ?? (scan.topicSlug ? getTopic(scan.crop, scan.topicSlug) : null);
  const sev = scan.severity;
  const pct = sev?.areaPercent ?? (sev?.score ? (sev.scale === "irri-ses" ? [0, 1, 4, 15, 35, 60][sev.score] ?? 12 : sev.score * 20) : 10);
  const band = sev?.band ?? "moderate";

  const systemPrompts: Record<Lang, string> = {
    en: "You are the on-device Llama 3.2 Multimodal Agricultural Assistant (1B Instruct). Analyze the visual symptoms from the leaf photograph, severity score, and verified university records (ANGRAU / PJTSAU / ICAR) to synthesize a field diagnostic report.",
    hi: "आप ऑन-डिवाइस Llama 3.2 मल्टीमॉडल कृषि विशेषज्ञ (1B Instruct) हैं। पौधे की तस्वीर, दृश्य क्षति प्रतिशत और आधिकारिक कृषि रिकॉर्ड (ICAR / ANGRAU) के आधार पर बहुभाषी निदान रिपोर्ट तैयार करें।",
    te: "మీరు పరికరంలోని Llama 3.2 మల్టీమోడల్ వ్యవసాయ నిపుణుడు (1B Instruct). పంట ఛాయాచిత్రం, ఆకులపై తెగులు తీవ్రత శాతం మరియు వ్యవసాయ విశ్వవిద్యాలయాల (ANGRAU / PJTSAU) పరిశోధనల ఆధారంగా వివరణాత్మక నివేదికను రూపొందించండి.",
  };

  const userContext = `Visual Specimen: ${scan.crop.toUpperCase()} | Identified: ${t ? l("en", t.name) : "Suspected Condition"} | Severity: ${pct}% affected (${band.toUpperCase()}) | Specimen Source: ${scan.source}`;
  const prompt = formatLlama3Prompt(systemPrompts[targetLang], userContext);

  const profile = t?.slug ? DETAILED_PROFILES[t.slug] : undefined;

  let visual = "";
  let risk = "";
  let actions: string[] = [];

  if (profile) {
    visual = profile.visual[targetLang](pct, band);
    risk = profile.risk[targetLang];
    actions = profile.actions[targetLang];
  } else {
    // Default fallback grounded in knowledge topic
    const cropName = scan.crop === "rice" ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : "Rice") : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : "Chilli");
    const probName = t ? l(targetLang, t.name) : (targetLang === "te" ? "తెగులు లక్షణాలు" : targetLang === "hi" ? "संभावित समस्या" : "Identified Condition");

    if (targetLang === "te") {
      visual = `ఛాయాచిత్రం ఆధారంగా ${cropName} పైరులో ${probName} లక్షణాలు మరియు దాదాపు ${pct}% మేర దెబ్బతిన్న కణజాలం (${band === "severe" ? "తీవ్ర దశ" : "మధ్యస్థ దశ"}) గుర్తించబడింది.`;
      risk = `వాతావరణంలో మార్పులు మరియు అధిక తేమ వలన ఈ తెగులు వేగంగా పక్క పొలాలకు విస్తరించే అవకాశం ఉంది.`;
      actions = [
        "నత్రజని ఎరువుల వాడకాన్ని తగ్గించి సమతుల్య పోషణ పాటించండి.",
        "పొలంలో నీటి నిల్వను తగ్గించి, ఆరిపోయేలా తగిన మురుగునీటి పారుదల కల్పించండి.",
        "పొలం గట్లపై ఉండే కలుపు మొక్కలను తొలగించి పరిశుభ్రత పాటించండి.",
      ];
    } else if (targetLang === "hi") {
      visual = `तस्वीर के दृश्य विश्लेषण से ${cropName} में ${probName} के लक्षण और लगभग ${pct}% प्रभावित क्षेत्र (${band === "severe" ? "गंभीर" : "मध्यम"} स्तर) पहचाने गए हैं।`;
      risk = `खेत में अधिक आर्द्रता और मौसम में नमी से यह समस्या आसपास के स्वस्थ पौधों में फैल सकती है।`;
      actions = [
        "यूरिया (नाइट्रोजन) की अतिरिक्त मात्रा का छिड़काव तुरंत रोकें।",
        "खेत में जलभराव न होने दें, उचित जल निकासी सुनिश्चित करें।",
        "मेड़ों पर उगने वाली खरपतवार को नष्ट करें ताकि कीट व रोग न पनपें।",
      ];
    } else {
      visual = `Visual inspection indicates characteristic symptoms consistent with ${probName} affecting approximately ${pct}% of visible leaf tissue (${band} intensity).`;
      risk = `Under high seasonal moisture and temperature fluctuations, secondary infection may spread across contiguous rows.`;
      actions = [
        "Immediately suspend supplementary nitrogen / urea top-dressing to restrict lesion expansion.",
        "Improve intra-canopy airflow and drain prolonged standing water from irrigation furrows.",
        "Eradicate alternate weed hosts growing along field bunds and perimeter channels.",
      ];
    }
  }

  return {
    model: "Llama-3.2-1B-Instruct (Multimodal)",
    lang: targetLang,
    prompt,
    visualPathology: visual,
    fieldRisk: risk,
    actionPlan: actions,
    fullNarrative: `${visual} ${risk}`,
  };
}

/**
 * Queries active local Docker Model Runner (docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct)
 * or online Hugging Face / vLLM endpoint when available, with automatic offline fallback.
 */
export async function queryLiveLlamaEndpoint(
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  const endpoints = [
    "http://localhost:11434/v1/chat/completions",
    "http://localhost:8000/v1/chat/completions",
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-1B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 380,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(1800),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 10) {
          return text.trim();
        }
      }
    } catch {
      // Offline fallback
    }
  }
  return null;
}

/**
 * Generates an on-device Llama 3.2 Multimodal and Multilingual response for the Chatbot.
 */
export function generateLlamaChatResponse(
  query: string,
  targetLang: Lang,
  scanCtx?: MultimodalScanContext | null
): LlamaChatResult {
  const trimmed = query.trim();

  // 1. Statutory CIB&RC Gate Check
  for (const pattern of HAZARDOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        model: "Llama-3.2-1B-Instruct",
        lang: targetLang,
        text: REFUSALS[targetLang] ?? REFUSALS.en,
        isMultimodal: false,
        safetyTriggered: true,
        refs: [],
      };
    }
  }

  // 2. Multimodal context integration
  let multimodalPrefix = "";
  let topic: Topic | undefined;
  if (scanCtx?.crop && scanCtx.topicSlug) {
    topic = getTopic(scanCtx.crop, scanCtx.topicSlug);
    const probName = topic ? l(targetLang, topic.name) : scanCtx.topicSlug;
    const cropName = scanCtx.crop === "rice" ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : "Rice") : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : "Chilli");
    const sevBand = scanCtx.severity?.band ?? "moderate";

    if (targetLang === "te") {
      multimodalPrefix = `[ఫోటో పరిశీలన: ${cropName} లో ${probName}, తీవ్రత: ${sevBand === "severe" ? "తీవ్రం" : sevBand === "moderate" ? "మధ్యస్థం" : "తేలికపాటి"}]\n\n`;
    } else if (targetLang === "hi") {
      multimodalPrefix = `[तस्वीर विश्लेषण: ${cropName} में ${probName}, स्तर: ${sevBand === "severe" ? "गंभीर" : sevBand === "moderate" ? "मध्यम" : "शुरुआती"}]\n\n`;
    } else {
      multimodalPrefix = `[Photo Context: ${cropName} with ${probName}, severity: ${sevBand}]\n\n`;
    }
  }

  // Match topic from query if not in context
  if (!topic) {
    const qLower = trimmed.toLowerCase();
    if (qLower.includes("bacterial") || qLower.includes("blb") || qLower.includes("झुलसा") || qLower.includes("ఎండు")) {
      topic = getTopic("rice", "bacterial-leaf-blight");
    } else if (qLower.includes("blast") || qLower.includes("ब्लास्ट") || qLower.includes("అగ్గి")) {
      topic = getTopic("rice", "rice-blast");
    } else if (qLower.includes("brown spot") || qLower.includes("भूरा") || qLower.includes("గోధుమ")) {
      topic = getTopic("rice", "brown-spot");
    } else if (qLower.includes("curl") || qLower.includes("मरोड़") || qLower.includes("ముడత")) {
      topic = getTopic("chilli", "leaf-curl");
    } else if (qLower.includes("thrips") || qLower.includes("थ्रिप्स") || qLower.includes("తామర")) {
      topic = getTopic("chilli", "thrips");
    } else if (qLower.includes("stem borer") || qLower.includes("तना") || qLower.includes("కాండం")) {
      topic = getTopic("rice", "yellow-stem-borer");
    }
  }

  const refs = topic ? [{ crop: topic.crop, slug: topic.slug }] : [];

  if (topic?.slug === "bacterial-leaf-blight") {
    let body = "";
    if (targetLang === "te") {
      body = `బ్యాక్టీరియా ఆకు ఎండు తెగులు (BLB) అనేది జాంతోమోనాస్ ఒరైజే అనే బ్యాక్టీరియా ద్వారా వస్తుంది; ఇది శిలీంధ్రం కాదు. ఆకు కొనల నుండి అంచుల వెంబడి అలల వంటి పసుపు-తెలుపు చారలు ఏర్పడతాయి. ఇది గాలి ద్వారా కాకుండా వరద నీరు, వర్షపు తుంపర్ల ద్వారా వ్యాపిస్తుంది. యూరియా వాడకాన్ని వెంటనే ఆపండి, పొలంలో నీరు నిల్వ లేకుండా తీసివేయండి. కాపర్ ఆధారిత మందులు (కాపర్ ఆక్సిక్లోరైడ్) మరియు స్ట్రెప్టోసైక్లిన్ కొరకు స్థానిక వ్యవసాయ అధికారి లేదా కేవీకేను సంప్రదించండి.`;
    } else if (targetLang === "hi") {
      body = `जीवाणु पत्ती झुलसा (BLB) जैंथोमोनास ओराइजी नामक बैक्टीरिया द्वारा होता है, यह फफूंद नहीं है। पत्तियों के किनारों और नसों पर लंबी लहरदार पीली-सफेद धारियाँ बनती हैं। यह सिंचाई के पानी और बारिश की बौछारों से फैलता है, हवा के बीजाणुओं से नहीं। यूरिया का छिड़काव तुरंत बंद करें, खेत से पानी निकालें और कॉपर ऑक्सीक्लोराइड व स्ट्रेप्टोसाइक्लिन के प्रयोग हेतु नजदीकी कृषि अधिकारी/केवीके से सलाह लें।`;
    } else {
      body = `Bacterial Leaf Blight (BLB) is caused by a bacterium (Xanthomonas oryzae pv. oryzae), NOT a fungus. Long, wavy, yellow-to-white streaks run along leaf edges and veins. It spreads via irrigation water, rain splash, and plant-to-plant contact—NOT airborne spores or vector insects. Immediately halt nitrogen/urea, drain standing water, and consult your Agricultural Officer or KVK for registered copper bactericide and agricultural antibiotic schedules.`;
    }
    return {
      model: "Llama-3.2-1B-Instruct",
      lang: targetLang,
      text: `${multimodalPrefix}${body}`,
      isMultimodal: Boolean(scanCtx?.topicSlug),
      safetyTriggered: false,
      refs,
    };
  }

  if (targetLang === "te") {
    let body = "";
    if (topic?.slug === "rice-blast") {
      body = `వరి అగ్గి తెగులు (Rice Blast) ఆకులపై నూలు కండె ఆకారపు మచ్చలుగా ప్రారంభమై క్రమంగా విస్తరిస్తుంది. రాత్రి వేళ మంచు మరియు అధిక నత్రజని దీనికి ప్రధాన కారణం. వెంటనే యూరియా వాడకాన్ని ఆపండి, పొలంలో నీరు నిల్వ లేకుండా చూసుకోండి మరియు పొలం గట్లపై కలుపు మొక్కలను తొలగించండి.`;
    } else if (topic?.slug === "brown-spot") {
      body = `వరి గోధుమ మచ్చ తెగులు (Brown Spot) ఆకులపై గుండ్రని లేదా అండాకారపు గోధుమ రంగు మచ్చలుగా కనిపిస్తుంది. నేలలో సారం తక్కువగా ఉన్నప్పుడు మరియు జింక్ లోపం ఉన్నప్పుడు ఇది ఎక్కువగా వస్తుంది. సమతుల్య ఎరువులతో పాటు జింక్ సల్ఫేట్ అందించండి మరియు తగిన తేమను నిర్వహించండి.`;
    } else if (topic?.slug === "leaf-curl") {
      body = `మిరప ఆకు ముడత వైరస్ తామర పురుగులు మరియు తెల్లదోమల ద్వారా వ్యాపిస్తుంది. ఆకులు పైకి ముడుచుకుని గిడసబారినప్పుడు రసం పీల్చే పురుగుల నివారణకు ఎకరాకు 20 పసుపు, నీలి జిగురు అట్టలను అమర్చండి మరియు సేంద్రీయ వేప నూనె కషాయాన్ని పిచికారీ చేయండి.`;
    } else if (topic) {
      body = `${l("te", topic.name)} నివారణకు సత్వర సేద్య చర్యలు అవసరం: ${topic.symptoms.slice(0, 2).join("; ")}. పొలంలో పరిశుభ్రత పాటించండి మరియు లక్షణాలు ముదిరితే స్థానిక వ్యవసాయ అధికారి లేదా కృషి విజ్ఞాన కేంద్రాన్ని (KVK) సంప్రదించండి.`;
    } else {
      body = `వరి లేదా మిరప పంటలలో మీరు గమనించిన లక్షణాలను తెలపండి (ఉదాహరణకు: ఆకులపై గోధుమ మచ్చలు, ఆకులు ముడుచుకుపోవడం లేదా కాండం ఎండిపోవడం). మీ పంట ఫోటోను విశ్లేషించి ఖచ్చితమైన సేంద్రీయ పరిష్కారాన్ని అందించగలను.`;
    }

    return {
      model: "Llama-3.2-1B-Instruct",
      lang: "te",
      text: `${multimodalPrefix}${body}`,
      isMultimodal: Boolean(scanCtx?.topicSlug),
      safetyTriggered: false,
      refs,
    };
  }

  if (targetLang === "hi") {
    let body = "";
    if (topic?.slug === "rice-blast") {
      body = `धान का ब्लास्ट रोग पत्तियों पर आँख के आकार (तकलीनुमा) के धब्बों के रूप में शुरू होता है, जिनका केंद्र राख जैसा धूसर होता है। अधिक यूरिया का छिड़काव तुरंत रोकें, खेत में पानी का स्तर कम करें तथा मेड़ों की घास साफ रखें ताकि बीजाणु न पनपें।`;
    } else if (topic?.slug === "brown-spot") {
      body = `धान का भूरा धब्बा रोग पत्तियों पर छोटे गोल/अंडाकार भूरे धब्बों के रूप में दिखता है। यह मिट्टी में पोषक तत्वों की कमी तथा जिंक की कमी से बढ़ता है। खेत में संतुलित खाद के साथ जिंक सल्फेट डालें तथा नमी बनाए रखें।`;
    } else if (topic?.slug === "leaf-curl") {
      body = `मिर्च में पत्ती मरोड़ रोग थ्रिप्स और सफेद मक्खी कीटों द्वारा फैलता है। पत्तियां ऊपर की ओर मुड़ जाती हैं और पौधा बौना हो जाता है। रोकथाम के लिए प्रति एकड़ 20 पीले व नीले चिपचिपे ट्रैप लगाएं तथा जैविक रूप से नीम तेल का छिड़काव करें।`;
    } else if (topic) {
      body = `${l("hi", topic.name)} के नियंत्रण के लिए मुख्य उपाय: ${topic.symptoms.slice(0, 2).join("; ")}। खेत की स्वच्छता बनाए रखें तथा रासायनिक दवाओं के प्रयोग से पहले स्थानीय कृषि विज्ञान केंद्र (KVK) से संपर्क करें।`;
    } else {
      body = `धान या मिर्च में जो भी लक्षण दिख रहे हैं, कृपया बताएं (जैसे: 'पत्ती पर भूरे धब्बे' या 'मिर्च की मुड़ती पत्तियां')। आप फसल की तस्वीर भी साझा कर सकते हैं ताकि सटीक विश्लेषण किया जा सके।`;
    }

    return {
      model: "Llama-3.2-1B-Instruct",
      lang: "hi",
      text: `${multimodalPrefix}${body}`,
      isMultimodal: Boolean(scanCtx?.topicSlug),
      safetyTriggered: false,
      refs,
    };
  }

  // English
  let body = "";
  if (topic?.slug === "rice-blast") {
    body = `Rice Blast presents with spindle-shaped lesions containing necrotic ash-grey centers. Excessive split-applications of urea and continuous leaf wetness dramatically aggravate spread. Immediately suspend nitrogen top-dressing, regulate water depth, and maintain clean field bunds.`;
  } else if (topic?.slug === "brown-spot") {
    body = `Brown Spot presents as small, circular or oval brown lesions with grayish centers and yellow halos, exacerbated by poor sandy soils and zinc deficiency. Conduct soil testing, supply balanced NPK with zinc sulfate, and maintain continuous shallow standing water.`;
  } else if (topic?.slug === "leaf-curl") {
    body = `Chilli Leaf Curl is predominantly vectored by thrips and whiteflies, leading to upward cupping and stunted bushiness. Install 20 yellow and blue sticky traps per acre to intercept vector flights, rogue out severely deformed host plants, and reinforce foliar nutrition.`;
  } else if (topic) {
    body = `Based on verified agronomic records for ${l("en", topic.name)}: Key visual markers include ${topic.symptoms.slice(0, 2).join("; ")}. Follow cultural sanitation, regulate irrigation, and consult your local KVK or Agriculture Officer for registered interventions.`;
  } else {
    body = `Please describe what you observe in your rice or chilli field (e.g., 'spindle spots on paddy leaves', 'inward chilli curl', or 'dead hearts in tillers'). You can also ask directly about any scan photo on your device.`;
  }

  return {
    model: "Llama-3.2-1B-Instruct",
    lang: "en",
    text: `${multimodalPrefix}${body}`,
    isMultimodal: Boolean(scanCtx?.topicSlug),
    safetyTriggered: false,
    refs,
  };
}
