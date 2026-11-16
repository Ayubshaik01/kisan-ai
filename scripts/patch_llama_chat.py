# -*- coding: utf-8 -*-
"""
Patch src/features/crop-care/services/llama.ts with intelligent intent-driven conversational logic.
"""
import sys

with open("src/features/crop-care/services/llama.ts", "r", encoding="utf-8") as f:
    content = f.read()

anchor = "export async function queryLiveLlamaEndpoint("
idx = content.find(anchor)
if idx == -1:
    print("Could not find anchor!")
    sys.exit(1)

head = content[:idx]

new_tail = '''export async function queryLiveLlamaEndpoint(
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return null;
  }

  // Auto-detect installed Ollama model if Ollama is running locally
  let ollamaModel = "llama3.2:1b";
  try {
    const tagsRes = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(500),
    });
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      if (Array.isArray(data?.models) && data.models.length > 0) {
        const found = data.models.find((m: any) =>
          typeof m.name === "string" && (m.name.includes("llama") || m.name.includes("crop") || m.name.includes("kisan"))
        );
        ollamaModel = found?.name || data.models[0].name;
      }
    }
  } catch {
    // Port 11434 not running or blocked
  }

  const endpoints = [
    {
      url: "http://localhost:11434/v1/chat/completions",
      model: ollamaModel,
    },
    {
      url: "http://localhost:8000/v1/chat/completions",
      model: "hf.co/meta-llama/Llama-3.2-1B-Instruct",
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ep.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 450,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(2000),
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

  // 2. Resolve topic from query or attached scan context
  let topic: Topic | undefined;
  const qLower = trimmed.toLowerCase();
  const qClean = qLower.replace(/[?!.,;:_\-]/g, " ").trim();
  const words = qClean.split(/\\s+/).filter(Boolean);

  // Disease mentions in query
  if (qLower.includes("bacterial") || qLower.includes("blb") || qLower.includes("झुलसा") || qLower.includes("ఆకు ఎండు") || qLower.includes("ఎండు తెగులు") || qLower.includes("கருகல்") || qLower.includes("ಕರಕು")) {
    topic = getTopic("rice", "bacterial-leaf-blight");
  } else if (qLower.includes("blast") || qLower.includes("ब्लास्ट") || qLower.includes("అగ్గి") || qLower.includes("కులై") || qLower.includes("குலை") || qLower.includes("ಬೆಂಕಿ")) {
    topic = getTopic("rice", "rice-blast");
  } else if (qLower.includes("brown spot") || qLower.includes("भूरा") || qLower.includes("గోధుమ") || qLower.includes("பழுப்பு") || qLower.includes("ಕಂದು")) {
    topic = getTopic("rice", "brown-spot");
  } else if (qLower.includes("tungro") || qLower.includes("टुंग्रो") || qLower.includes("టుంగ్రో") || qLower.includes("துங்ரோ")) {
    topic = getTopic("rice", "tungro");
  } else if (qLower.includes("bph") || qLower.includes("planthopper") || qLower.includes("hopperburn") || qLower.includes("फुदका") || qLower.includes("సుడి దోమ") || qLower.includes("దోమ") || qLower.includes("தத்துப்பூச்சி")) {
    topic = getTopic("rice", "brown-planthopper");
  } else if (qLower.includes("stem borer") || qLower.includes("तना छेदक") || qLower.includes("కాండం తొలిచే") || qLower.includes("మొవ్వు") || qLower.includes("தண்டு துளைப்பான்") || qLower.includes("ಕಾಂಡ ಕೊರೆಯುವ")) {
    topic = getTopic("rice", "yellow-stem-borer");
  } else if (qLower.includes("folder") || qLower.includes("roller") || qLower.includes("लपेटक") || qLower.includes("ఆకు చుట్టు") || qLower.includes("இலை சுருட்டு") || qLower.includes("ಎಲೆ ಮಡಚುವ")) {
    topic = getTopic("rice", "leaf-folder");
  } else if (qLower.includes("gall midge") || qLower.includes("गाल मिज") || qLower.includes("ఉల్లి కోడు") || qLower.includes("ஆனೈக்கொம்பன்") || qLower.includes("ಬೆಳ್ಳಿ ಸುಳಿ")) {
    topic = getTopic("rice", "gall-midge");
  } else if (qLower.includes("hispa") || qLower.includes("हिस्पा") || qLower.includes("ముళ్ల పురుగు") || qLower.includes("முள் வண்டு")) {
    topic = getTopic("rice", "hispa");
  } else if (qLower.includes("streak") || qLower.includes("bls") || qLower.includes("धारी") || qLower.includes("చారల తెగులు")) {
    topic = getTopic("rice", "bacterial-leaf-streak");
  } else if (qLower.includes("crazy top") || qLower.includes("downy") || qLower.includes("पिच्चि") || qLower.includes("పిచ్చి దుబ్బు")) {
    topic = getTopic("rice", "downy-mildew");
  } else if (qLower.includes("curl") || qLower.includes("मरोड़") || qLower.includes("ముడత") || qLower.includes("சுருட்டை") || qLower.includes("ಮುದುರು") || qLower.includes("चुरडा")) {
    topic = getTopic("chilli", "leaf-curl");
  } else if (qLower.includes("thrips") || qLower.includes("थ्रिप्स") || qLower.includes("తామర") || qLower.includes("இலைப்பேன்") || qLower.includes("ಹೇನು")) {
    topic = getTopic("chilli", "thrips");
  } else if (qLower.includes("mite") || qLower.includes("माइट") || qLower.includes("నల్లి") || qLower.includes("சிலந்தி") || qLower.includes("ನುಸಿ")) {
    topic = getTopic("chilli", "mites");
  } else if (qLower.includes("whitefly") || qLower.includes("मक्खी") || qLower.includes("తెల్లదోమ") || qLower.includes("வெள்ளை ஈ") || qLower.includes("ಬಿಳಿ ನೊಣ")) {
    topic = getTopic("chilli", "whitefly");
  } else if (qLower.includes("aphid") || qLower.includes("माहू") || qLower.includes("పేను బంక") || qLower.includes("அசுவினி")) {
    topic = getTopic("chilli", "aphids");
  } else if (qLower.includes("anthracnose") || qLower.includes("fruit rot") || qLower.includes("कुकड़ा") || qLower.includes("कफ") || qLower.includes("కాయ కుళ్ళు") || qLower.includes("డై-బ్యాక్")) {
    topic = getTopic("chilli", "anthracnose");
  } else if (qLower.includes("powdery") || qLower.includes("mildew") || qLower.includes("बबूला") || qLower.includes("बर्फ") || qLower.includes("బూడిద తెగులు")) {
    topic = getTopic("chilli", "powdery-mildew");
  } else if (qLower.includes("cercospora") || qLower.includes("frogeye") || qLower.includes("कण") || qLower.includes("కప్ప కన్ను")) {
    topic = getTopic("chilli", "cercospora-leaf-spot");
  } else if (qLower.includes("bacterial spot") || qLower.includes("जीवाणु धब्बा") || qLower.includes("బ్యాక్టీరియా మచ్చ")) {
    topic = getTopic("chilli", "bacterial-leaf-spot");
  }

  // Fallback to scan context if query doesn't specify a condition
  if (!topic && scanCtx?.crop && scanCtx.topicSlug) {
    topic = getTopic(scanCtx.crop, scanCtx.topicSlug);
  }

  const refs = topic ? [{ crop: topic.crop, slug: topic.slug }] : [];
  const cropType = topic?.crop || scanCtx?.crop || "rice";
  const cropName = cropType === "rice"
    ? (targetLang === "te" ? "వరి" : targetLang === "hi" ? "धान" : targetLang === "ta" ? "நெல்" : targetLang === "kn" ? "ಭತ್ತ" : targetLang === "mr" ? "भात" : "Rice")
    : (targetLang === "te" ? "మిరప" : targetLang === "hi" ? "मिर्च" : targetLang === "ta" ? "மிளகாய்" : targetLang === "kn" ? "ಮೆಣಸಿನಕಾಯಿ" : targetLang === "mr" ? "मिरची" : "Chilli");
  const probName = topic ? l(targetLang, topic.name) : (cropType === "rice" ? (targetLang === "te" ? "వరి పంట" : targetLang === "hi" ? "धान की फसल" : "Rice Crop") : (targetLang === "te" ? "మిరప పంట" : targetLang === "hi" ? "मिर्च की फसल" : "Chilli Crop"));
  const sevBand = scanCtx?.severity?.band ?? "moderate";
  const sevBandLocal = targetLang === "te"
    ? (sevBand === "severe" ? "తీవ్ర" : sevBand === "moderate" ? "మధ్యస్థ" : "తేలికపాటి")
    : targetLang === "hi"
    ? (sevBand === "severe" ? "गंभीर" : sevBand === "moderate" ? "मध्यम" : "शुरुआती")
    : targetLang === "ta"
    ? (sevBand === "severe" ? "தீவிர" : sevBand === "moderate" ? "மிதமான" : "ஆரம்ப")
    : targetLang === "kn"
    ? (sevBand === "severe" ? "ತೀವ್ರ" : sevBand === "moderate" ? "ಮಧ್ಯಮ" : "ಆರಂಭಿಕ")
    : targetLang === "mr"
    ? (sevBand === "severe" ? "गंभीर" : sevBand === "moderate" ? "मध्यम" : "सुरुवातीची")
    : sevBand;

  // 3. User Intent Classification
  const isGreetingWord = (w: string) => /^(bro|hi|hello|hey|yo|sup|namaste|namaskar|vanakkam|kisan|bot|assistant|anna|bhai|bhaiya|dada|help|హాయ్|హలో|నమస్కారం|నమస్తే|బ్రో|అన్నా|బాగున్నారా|చెప్పు|नमस्ते|भाई|हैलो|हाय|मदद|सुनो|बताओ|राम राम|प्रणाम|வணக்கம்|ஹலோ|ஹாய்|உதவி|ನಮಸ್ಕಾರ|ಹಲೋ|ಹಾಯ್|ಸಹಾಯ|नमस्कार|हॅलो|भाऊ|मदत)$/i.test(w);
  const isGreeting = (words.length > 0 && words.length <= 4 && words.every(w => isGreetingWord(w) || /^(there|you|kisanai|ji|aru|sir|mitra)$/i.test(w))) || (words.length === 1 && isGreetingWord(words[0]));

  const isAction = /what to do|what should i do|how to treat|treatment|how to cure|remedy|remedies|control|how to control|solution|management|spray|prevent spread|cure|medicine|pesticide|fungicide|measures|steps|action|plan|how to save|manage|చేయాలి|తగ్గించాలి|నివారణ|మందు|స్ప్రే|నియంత్రణ|చికిత్స|ఉపాయం|కాపాడాలి|యాజమాన్యం|क्या करें|करना चाहिए|रोकथाम|उपचार|दवा|छिड़काव|ठीक|नियंत्रण|उपाय|बचाव|प्रबंधन|செய்ய வேண்டும்|சிகிச்சை|கட்டுப்பாடு|மருந்து|தெளிக்க|நிவாரணம்|ಮಾಡಬೇಕು|ಚಿಕಿತ್ಸೆ|ನಿಯಂತ್ರಣ|ಔಷಧ|ಸಿಂಪಡಣೆ|ಪರಿಹಾರ|काय करावे|उपाय|औषध|फवारणी|नियंत्रण/i.test(qClean);

  const isCause = /why|cause|reason|how did it happen|pathogen|origin|fungus|bacteria|pest|weather|humidity|dew|rain|spread|spreads|infect|ఎందుకు|కారణం|వ్యాపించింది|ఎలా వచ్చింది|వాతావరణం|తేమ|శిలీంధ్రం|బ్యాక్టీరియా|పురుగు|क्यों|कारण|वजह|फैला|फंगस|मौसम|नमी|जीवाणु|कीट|ஏன்|காரணம்|பரவியது|மழை|பூஞ்சை|பாக்டீரியா|ಏಕೆ|ಕಾರಣ|ಹರಡಿತು|ಮಳೆ|ಶಿಲೀಂಧ್ರ|बुरशी|का|कारण|पसरले|पाऊस/i.test(qClean);

  const isSimple = /simple|summary|summarize|in simple words|simple words|explain simply|easy|plain words|meaning|tell me simply|what does it mean|సులభంగా|సాధారణ మాటల్లో|సారాంశం|అర్థం|తేలికగా|తేలికైన భాషలో|సులభం|सरल शब्दों में|सरल|आसान|संक्षेप|मतलब|साधारण|எளிய முறையில்|சுருக்கம்|விளக்கம்|சுலபம்|ಸರಳವಾಗಿ|ಸಾರಾಂಶ|ಅರ್ಥ|ಸರಳ|सोप्या शब्दात|थोडक्यात|अर्थ|सोपे/i.test(qClean);

  const isPrevention = /prevent|prevention|future|next season|next time|avoid|precaution|ముందుజాగ్రత్త|రాకుండా|భవిష్యత్తు|మరోసారి|నివారించడానికి|बचाव|रोकथाम|भविष्य|अगली बार|सावधानी|முன்னெச்சரிக்கை|தடுக்க|அடுத்த முறை|ಮುನ್ನೆಚ್ಚರಿಕೆ|ತಡೆಯಲು|ಮುಂದಿನ ಬಾರಿ|काळजी|प्रतिबंध|पुढील हंगामात/i.test(qClean);

  const isSymptoms = /what is this|symptoms|identify|identification|signs|how to recognize|look like|pathology|lesion|color|appearance|లక్షణాలు|గుర్తించడం|ఇది ఏమిటి|ఎలా గుర్తించాలి|మచ్చలు|రంగు|लक्षण|पहचान|यह क्या है|कैसे पहचाने|धब्बे|रंग|அறிகுறிகள்|அடையாளம்|இது என்ன|புள்ளிகள்|ಲಕ್ಷಣಗಳು|ಗುರುತಿಸುವಿಕೆ|ಇದು ಏನು|ಮಚ್ಚೆಗಳು|लक्षणे|ओळख|हे काय आहे|ठिपके/i.test(qClean);

  const prof = topic ? DETAILED_PROFILES[topic.slug] : undefined;
  const visualText = prof
    ? (prof.visual[targetLang]?.(20, sevBand) ?? prof.visual.en(20, sevBand))
    : (topic ? topic.symptoms.slice(0, 3).join(", ") : "");
  const riskText = prof
    ? (prof.risk[targetLang] ?? prof.risk.en)
    : (targetLang === "te" ? "వాతావరణంలో అధిక తేమ మరియు అనుకూల ఉష్ణోగ్రతలు ఉన్నప్పుడు వ్యాధి వ్యాప్తి పెరుగుతుంది." : "Pathogen spreads under humid conditions and prolonged leaf wetness.");
  const actionsList = prof
    ? (prof.actions[targetLang] ?? prof.actions.en)
    : (topic ? topic.management.cultural : ["Suspend nitrogen application", "Ensure field drainage", "Consult local agriculture officers"]);

  let responseText = "";

  // 4. Intent Dispatch

  // A. GREETING / CASUAL OUTREACH
  if (isGreeting) {
    if (topic) {
      if (targetLang === "te") {
        responseText = `నమస్కారం! నేను మీ కిసాన్ ఏఐ (KisanAI) వ్యవసాయ సహాయకుడిని. మీ ఫోటోలో ${cropName} పంటపై **${probName}** (${sevBandLocal} దశ) ఉన్నట్లు గుర్తించాను.\\n\\nనేను మీకు ఎలా సహాయపడగలను? మీరు నన్ను ఇలా అడగవచ్చు:\\n• 🛠️ **"ఏం చేయాలి?"** — తక్షణ నివారణ మరియు యాజమాన్య చర్యల కోసం\\n• ⚠️ **"ఎందుకు వచ్చింది?"** — కారణాలు మరియు వాతావరణ ప్రభావం తెలుసుకోవడానికి\\n• 📝 **"సులభంగా వివరించు"** — సాధారణ మాటల్లో తేలికైన సారాంశం కోసం\\n• లేదా ఎరువులు, నీటి యాజమాన్యం గురించి ఏదైనా సందేహం అడగవచ్చు!`;
      } else if (targetLang === "hi") {
        responseText = `नमस्ते! मैं किसान एआई (KisanAI) आपका डिजिटल कृषि सहायक हूँ। मैंने आपकी तस्वीर में ${cropName} पर **${probName}** (${sevBandLocal} स्तर) की पहचान की है।\\n\\nमैं आपकी क्या मदद कर सकता हूँ? आप पूछ सकते हैं:\\n• 🛠️ **"क्या करें?"** — तत्काल रोकथाम और उपचार के उपाय\\n• ⚠️ **"क्यों हुआ?"** — रोग के जैविक कारण और मौसम का प्रभाव\\n• 📝 **"सरल शब्दों में बताओ"** — आसान भाषा में सारांश\\n• या खाद, सिंचाई और सुरक्षा से संबंधित कोई भी सवाल!`;
      } else if (targetLang === "ta") {
        responseText = `வணக்கம்! நான் உங்கள் கிசான் AI (KisanAI) வேளாண் உதவியாளர். உங்கள் புகைப்படத்தில் ${cropName} பயிரில் **${probName}** (${sevBandLocal} நிலை) இருப்பதை நான் கண்டறிந்துள்ளேன்.\\n\\nநான் உங்களுக்கு எவ்வாறு உதவலாம்? நீங்கள் கேட்கலாம்:\\n• 🛠️ **"என்ன செய்ய வேண்டும்?"** — உடனடி கட்டுப்பாடு மற்றும் மேலாண்மை\\n• ⚠️ **"ஏன் வந்தது?"** — காரணங்கள் மற்றும் வானிலை தாக்கம்\\n• 📝 **"எளிய விளக்கம்"** — எளிய முறையில் புரிந்து கொள்ள!`;
      } else if (targetLang === "kn") {
        responseText = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕಿಸಾನ್ AI (KisanAI) ಕೃಷಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಫೋಟೋದಲ್ಲಿ ${cropName} ಬೆಳೆಯಲ್ಲಿ **${probName}** (${sevBandLocal} ತೀವ್ರತೆ) ರೋಗಲಕ್ಷಣವನ್ನು ಗುರುತಿಸಿದ್ದೇನೆ.\\n\\nನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನೀವು ಕೇಳಬಹುದು:\\n• 🛠️ **"ಏನು ಮಾಡಬೇಕು?"** — ತಕ್ಷಣದ ನಿಯಂತ್ರಣ ಕ್ರಮಗಳು\\n• ⚠️ **"ಏಕೆ ಬಂತು?"** — ರೋಗದ ಕಾರಣಗಳು ಮತ್ತು ಹರಡುವಿಕೆ\\n• 📝 **"ಸರಳ ವಿವರಣೆ"** — ಸುಲಭವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು!`;
      } else if (targetLang === "mr") {
        responseText = `नमस्कार! मी किसान AI (KisanAI) आपला डिजिटल कृषी सल्लागार. आपल्या छायाचित्रात ${cropName} पिकावर **${probName}** (${sevBandLocal} पातळी) ची लक्षणे दिसून येत आहेत.\\n\\nमी आपल्याला कशी मदत करू शकेन? आपण विचारू शकता:\\n• 🛠️ **"काय करावे?"** — तातडीने करावयाचे उपाय व व्यवस्थापन\\n• ⚠️ **"का झाले?"** — रोगाचे कारण आणि हवामानाचा प्रभाव\\n• 📝 **"सोप्या शब्दात सांगा"** — साध्या भाषेतील माहिती!`;
      } else {
        responseText = `Hello! I am KisanAI, your digital agronomy assistant. I see your photo scan shows **${probName}** (${sevBand} severity) on **${cropName}**.\\n\\nHow can I help you manage your crop today? You can ask me:\\n• 🛠️ **"What should I do?"** — for immediate steps to treat and stop it spreading\\n• ⚠️ **"Why did this happen?"** — to understand biological causes and weather risks\\n• 📝 **"Explain in simple words"** — for a quick, farmer-friendly summary\\n• Or ask any question about fertilizers, water drainage, or organic sprays!`;
      }
    } else {
      if (targetLang === "te") {
        responseText = `నమస్కారం! నేను కిసాన్ ఏఐ (KisanAI) వ్యవసాయ సహాయకుడిని.\\n\\nమీ వరి లేదా మిరప పంట ఆకు ఫోటోను స్కాన్ చేయండి లేదా తెగులు లక్షణాలు, ఎరువుల సందేహాలు ఇక్కడ అడగండి!`;
      } else if (targetLang === "hi") {
        responseText = `नमस्ते! मैं किसान एआई (KisanAI) ऑन-डिवाइस कृषि सहायक हूँ।\\n\\nआप अपनी धान या मिर्च की फसल की पत्ती का फोटो स्कैन करके या सीधे सवाल लिखकर मुझसे समाधान पूछ सकते हैं!`;
      } else if (targetLang === "ta") {
        responseText = `வணக்கம்! நான் உங்கள் கிசான் AI (KisanAI) வேளாண் உதவியாளர். உங்கள் பயிரின் புகைப்படத்தை ஸ்கேன் செய்தோ அல்லது சந்தேகங்களை எழுதியோ தீர்வு பெறலாம்!`;
      } else if (targetLang === "kn") {
        responseText = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕಿಸಾನ್ AI (KisanAI) ಕೃಷಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಬೆಳೆಯ ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ ಪರಿಹಾರ ಪಡೆಯಿರಿ!`;
      } else if (targetLang === "mr") {
        responseText = `नमस्कार! मी किसान AI (KisanAI) कृषी सहाय्यक आहे. आपल्या पिकाचा फोटो स्कॅन करून किंवा थेट प्रश्न विचारून मार्गदर्शन मिळवा!`;
      } else {
        responseText = `Hello! I am KisanAI, your on-device agricultural assistant.\\n\\nYou can scan a leaf photograph for instant disease diagnosis, or ask any agronomic question about Rice and Chilli pest and disease management!`;
      }
    }
  }

  // B. WHAT TO DO / ACTION PLAN / TREATMENT
  else if (isAction && topic) {
    if (targetLang === "te") {
      responseText = `🛠️ **${probName} (${cropName}) నివారణకు చేపట్టాల్సిన తక్షణ చర్యలు**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *గమనిక: రసాయనాలు వాడేటప్పుడు రక్షణ జాగ్రత్తలు పాటించండి. స్థానిక కృషి విజ్ఞాన కేంద్రం (KVK) నిపుణుల సలహాలు తీసుకోండి.*`;
    } else if (targetLang === "hi") {
      responseText = `🛠️ **${probName} (${cropName}) के उपचार एवं नियंत्रण के मुख्य उपाय**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *सावधानी: अनुमोदित उपायों का ही पालन करें। सुरक्षा हेतु मास्क व दस्ताने पहनें तथा स्थानीय कृषि विशेषज्ञ से परामर्श लें।*`;
    } else if (targetLang === "ta") {
      responseText = `🛠️ **${probName} (${cropName}) மேலாண்மைக்கான உடனடி நடவடிக்கைகள்**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *குறிப்பு: பாதுகாப்பு வழிமுறைகளைப் பின்பற்றி உள்ளூர் வேளாண் அதிகாரியை அணுகவும்.*`;
    } else if (targetLang === "kn") {
      responseText = `🛠️ **${probName} (${cropName}) ನಿಯಂತ್ರಣಕ್ಕಾಗಿ ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮಗಳು**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *ಸೂಚನೆ: ಅಧಿಕೃತ ರಕ್ಷಣಾ ಕ್ರಮಗಳನ್ನು ಅನುಸರಿಸಿ ಹಾಗೂ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.*`;
    } else if (targetLang === "mr") {
      responseText = `🛠️ **${probName} (${cropName}) व्यवस्थापनासाठी तातडीचे उपाय**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *टीप: कीटकनाशके हाताळताना सुरक्षितता बाळगा आणि स्थानिक कृषी तज्ज्ञांचा सल्ला घ्या.*`;
    } else {
      responseText = `🛠️ **Recommended Action Plan for ${probName} (${cropName})**:\\n\\n` +
        actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n\\n") +
        `\\n\\n📌 *Safety Notice: Strictly adhere to statutory CIB&RC guidelines. Wear protective gear during field applications and consult your local Agriculture Officer or KVK.*`;
    }
  }

  // C. WHY DID THIS HAPPEN / CAUSE / SPREAD
  else if (isCause && topic) {
    if (targetLang === "te") {
      responseText = `⚠️ **${probName} రావడానికి కారణాలు & వ్యాప్తి**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **వ్యాప్తిని పెంచే అనుకూల పరిస్థితులు**:\\n` +
        `• అధిక యూరియా (నత్రజని) వాడకం మొక్క కణజాలాన్ని మృదువుగా చేసి తెగులు సోకేలా చేస్తుంది.\\n` +
        `• గాలిలో 85-90% కంటే ఎక్కువ తేమ మరియు రాత్రి వేళల్లో ఆకులపై మంచు బిందువులు నిలవడం.\\n` +
        `• మొక్కలు దగ్గరగా నాటడం వల్ల గాలి, వెలుతురు సరిగ్గా ప్రసరించకపోవడం.`;
    } else if (targetLang === "hi") {
      responseText = `⚠️ **${probName} के जैविक कारण और फैलाव**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **रोग को बढ़ावा देने वाले मुख्य कारक**:\\n` +
        `• यूरिया (नाइट्रोजन) का अत्यधिक प्रयोग पत्तियों को कोमल बना देता है जिससे संक्रमण तेजी से फैलता है।\\n` +
        `• वातावरण में 85-90% से अधिक नमी तथा रात के समय पत्तियों पर ओस का लंबे समय तक ठहरना।\\n` +
        `• पौधों का अधिक घना होना जिससे खेत में हवा और धूप का संचार रुक जाता है।`;
    } else if (targetLang === "ta") {
      responseText = `⚠️ **${probName} காரணங்கள் மற்றும் பரவுதல்**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **நோயை அதிகரிக்கும் காரணிகள்**:\\n` +
        `• அதிகப்படியான யூரியா பயன்பாடு.\\n` +
        `• காற்றில் அதிக ஈரப்பதம் மற்றும் இலைகளில் பனித்துளிகள் தங்குதல்.`;
    } else if (targetLang === "kn") {
      responseText = `⚠️ **${probName} ರೋಗದ ಕಾರಣಗಳು ಮತ್ತು ಹರಡುವಿಕೆ**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **ರೋಗ ಹೆಚ್ಚಾಗಲು ಪ್ರಮುಖ ಅಂಶಗಳು**:\\n` +
        `• ಅತಿಯಾದ ಯೂರಿಯಾ ಬಳಕೆ.\\n` +
        `• ವಾತಾವರಣದಲ್ಲಿ ಹೆಚ್ಚಿನ ತೇವಾಂಶ ಮತ್ತು ಇಬ್ಬನಿ ನಿಲ್ಲುವುದು.`;
    } else if (targetLang === "mr") {
      responseText = `⚠️ **${probName} रोगाची जैविक कारणे व प्रसार**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **रोग वाढवणारे घटक**:\\n` +
        `• अतिरिक्त युरिया खताचा वापर.\\n` +
        `• हवेतील जास्त आर्द्रता आणि पानांवर साचलेले दव.`;
    } else {
      responseText = `⚠️ **Causes & Spread of ${probName} (${cropName})**:\\n\\n` +
        `${riskText}\\n\\n` +
        `🌧️ **Field Triggers to Watch**:\\n` +
        `• Over-application of chemical nitrogen (urea) makes plant cuticle thin and susceptible to penetration.\\n` +
        `• Relative humidity above 85-90% combined with dewy nights accelerates spore propagation.\\n` +
        `• Dense planting that limits intra-canopy sunlight and air circulation.`;
    }
  }

  // D. SIMPLE WORDS / MEANING / SUMMARY
  else if (isSimple && topic) {
    if (targetLang === "te") {
      responseText = `🌾 **${probName} గురించి సులభమైన వివరణ**:\\n\\n` +
        `• **ఇది ఏమిటి?**: ఇది ${cropName} పంటలో సాధారణంగా కనిపించే సమస్య. దీనివల్ల ఆకులు ఎండిపోయి లేదా దెబ్బతిని పంట ఎదుగుదల తగ్గుతుంది.\\n` +
        `• **ముఖ్య కారణం**: వాతావరణంలో తేమ ఎక్కువగా ఉన్నప్పుడు లేదా యూరియా ఎరువును ఎక్కువగా వేసినప్పుడు ఇది వేగంగా వస్తుంది.\\n` +
        `• **మీరు వెంటనే చేయాల్సింది**: భయపడవద్దు! వెంటనే యూరియా వేయడం ఆపండి, పొలంలో నిలిచిన నీటిని తీసివేయండి మరియు గట్లపై కలుపు లేకుండా చూసుకోండి.`;
    } else if (targetLang === "hi") {
      responseText = `🌾 **${probName} का सरल शब्दों में सारांश**:\\n\\n` +
        `• **यह क्या है?**: यह ${cropName} की एक आम समस्या है, जो पत्तियों को नुकसान पहुँचाती है और समय पर रोकथाम न होने पर पैदावार घटा सकती है।\\n` +
        `• **मुख्य वजह**: खेत में अधिक नमी, ओस और जरूरत से ज्यादा यूरिया खाद डालने से यह तेजी से फैलता है।\\n` +
        `• **किसान तुरंत क्या करें?**: घबराएं नहीं! तुरंत यूरिया डालना बंद करें, खेत से अतिरिक्त पानी निकालें और मेड़ों की खरपतवार साफ रखें।`;
    } else if (targetLang === "ta") {
      responseText = `🌾 **${probName} - எளிய விளக்கம்**:\\n\\n` +
        `• **இது என்ன?**: இது ${cropName} பயிரில் இலைகளைத் தாக்கும் பொதுவான நோயாகும்.\\n` +
        `• **முக்கிய காரணம்**: அதிக ஈரப்பதம் மற்றும் அதிகப்படியான யூரியா உரம்.\\n` +
        `• **உடனடி நடவடிக்கை**: யூரியாவை உடனே நிறுத்துங்கள்; தேங்கிய தண்ணீரை வடியுங்கள்.`;
    } else if (targetLang === "kn") {
      responseText = `🌾 **${probName} - ಸರಳ ಸಾರಾಂಶ**:\\n\\n` +
        `• **ಇದು ಏನು?**: ಇದು ${cropName} ಬೆಳೆಯಲ್ಲಿ ಎಲೆಗಳಿಗೆ ಹಾನಿ ಮಾಡುವ ಸಾಮಾನ್ಯ ರೋಗವಾಗಿದೆ.\\n` +
        `• **ಮುಖ್ಯ ಕಾರಣ**: ಅಧಿಕ ತೇವಾಂಶ ಮತ್ತು ಅತಿಯಾದ ಯೂರಿಯಾ ಗೊಬ್ಬರ ಬಳಕೆ.\\n` +
        `• **ತಕ್ಷಣ ಮಾಡಬೇಕಾದದ್ದು**: ಯೂರಿಯಾ ಕೊಡುವುದನ್ನು ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ; ಗದ್ದೆಯಲ್ಲಿ ನಿಂತ ನೀರನ್ನು ಹೊರಹಾಕಿ.`;
    } else if (targetLang === "mr") {
      responseText = `🌾 **${probName} - सोप्या शब्दात माहिती**:\\n\\n` +
        `• **हे काय आहे?**: ही ${cropName} पिकावरील पानांचे नुकसान करणारी एक सर्वसामान्य अडचण आहे.\\n` +
        `• **मुख्य कारण**: हवेतील जास्त दमटपणा आणि गरजेपेक्षा जास्त युरियाचा वापर.\\n` +
        `• **शेतकऱ्यांनी लगेच काय करावे?**: अतिरिक्त युरिया बंद करा आणि शेतात साचलेले पाणी बाहेर काढा.`;
    } else {
      responseText = `🌾 **${probName} in Simple Words**:\\n\\n` +
        `• **What is it?**: ${probName} is a common crop health problem on ${cropName}. It attacks foliage, reduces healthy green leaf area, and lowers yield if neglected.\\n` +
        `• **Main Reason**: High moisture, cloudy dewy weather, and applying too much nitrogen (urea) trigger rapid spread.\\n` +
        `• **What to do right now**: Do not panic! Immediately suspend supplementary urea, ensure proper field water drainage, and keep bunds free from weeds.`;
    }
  }

  // E. SYMPTOMS / IDENTIFICATION
  else if (isSymptoms && topic) {
    if (targetLang === "te") {
      responseText = `🔍 **${probName} (${cropName}) వ్యాధి లక్షణాలు & గుర్తింపు**:\\n\\n` +
        `${visualText}\\n\\n` +
        `🔬 **పొలంలో గుర్తించే విధానం**:\\n` +
        `• ఆకుల పై భాగం మరియు క్రింది భాగాన్ని నిశితంగా పరిశీలించండి.\\n` +
        `• మచ్చల ఆకారం, రంగు మార్పులు మరియు ఆకు కొనల ఎండిపోవడాన్ని గమనించండి.`;
    } else if (targetLang === "hi") {
      responseText = `🔍 **${probName} (${cropName}) के दृश्य लक्षण और पहचान**:\\n\\n` +
        `${visualText}\\n\\n` +
        `🔬 **खेत में पहचान के संकेत**:\\n` +
        `• पत्तियों की दोनों सतहों (ऊपर व नीचे) का ध्यानपूर्वक निरीक्षण करें।\\n` +
        `• धब्बों का आकार, किनारों का रंग और पत्तियों के सूखने का पैटर्न देखें।`;
    } else if (targetLang === "ta") {
      responseText = `🔍 **${probName} அறிகுறிகள் மற்றும் அடையாளம் காணுதல்**:\\n\\n` +
        `${visualText}`;
    } else if (targetLang === "kn") {
      responseText = `🔍 **${probName} ರೋಗ ಲಕ್ಷಣಗಳು ಮತ್ತು ಗುರುತಿಸುವಿಕೆ**:\\n\\n` +
        `${visualText}`;
    } else if (targetLang === "mr") {
      responseText = `🔍 **${probName} रोग लक्षणे आणि ओळख**:\\n\\n` +
        `${visualText}`;
    } else {
      responseText = `🔍 **Visual Symptoms & Pathology for ${probName} (${cropName})**:\\n\\n` +
        `${visualText}\\n\\n` +
        `🔬 **Field Scouting Guide**:\\n` +
        `• Inspect upper and lower leaf surfaces along the middle and top foliage canopy.\\n` +
        `• Check whether lesions form discrete eyespots, water-soaked margins, or streak patterns along veins.`;
    }
  }

  // F. PREVENTION / FUTURE SEASONS
  else if (isPrevention && topic) {
    if (targetLang === "te") {
      responseText = `🛡️ **${probName} (${cropName}) రాకుండా భవిష్యత్తులో తీసుకోవాల్సిన ముందుజాగ్రత్తలు**:\\n\\n` +
        `1. **విత్తన శుద్ధి**: సర్టిఫైడ్ విత్తనాలను ఎంపిక చేసుకుని ట్రైకోడెర్మా లేదా సూడోమోనాస్ తో విత్తన శుద్ధి చేయండి.\\n` +
        `2. **సమతుల్య ఎరువులు**: మట్టి పరీక్ష ఆధారంగా పొటాష్ మరియు జింక్ ఎరువులను సమతుల్యంగా వేయండి; యూరియాను ఒకేసారి ఎక్కువగా వేయవద్దు.\\n` +
        `3. **పొలం పరిశుభ్రత**: పంట అవశేషాలను నాశనం చేయండి మరియు గట్లపై ఉండే కలుపును ఎప్పటికప్పుడు తొలగించండి.\\n` +
        `4. **తట్టుకునే రకాలు**: విశ్వవిద్యాలయం సిఫారసు చేసిన తెగులును తట్టుకునే విత్తన రకాలను సాగు చేయండి.`;
    } else if (targetLang === "hi") {
      responseText = `🛡️ **${probName} (${cropName}) से बचाव हेतु अग्रिम प्रबंधन**:\\n\\n` +
        `1. **बीज शोधन**: प्रमाणित बीजों का चयन करें तथा ट्राइकोडर्मा या स्यूडोमोनास से बीज उपचार अवश्य करें।\\n` +
        `2. **संतुलित पोषण**: मृदा परीक्षण के अनुसार पोटाश और जिंक का प्रयोग करें; एक साथ अधिक यूरिया न दें।\\n` +
        `3. **खेत की स्वच्छता**: पिछली फसल के अवशेष नष्ट करें और मेड़ों पर उगने वाली खरपतवार साफ रखें।\\n` +
        `4. **प्रतिरोधी किस्में**: अपने क्षेत्र के लिए अनुशंसित रोग-प्रतिरोधी प्रजातियों का ही चयन करें।`;
    } else {
      responseText = `🛡️ **Preventive & Cultural Practices for ${probName} (${cropName})**:\\n\\n` +
        `1. **Seed Treatment**: Use certified pathogen-free seeds treated with *Trichoderma viride* or *Pseudomonas fluorescens*.\\n` +
        `2. **Balanced Nutrition**: Apply Potassium (MOP) and micronutrients based on soil test; avoid excessive single-dose urea.\\n` +
        `3. **Sanitation**: Remove crop residues and eradicate alternate grassy hosts from field bunds.\\n` +
        `4. **Resistant Cultivars**: Choose university-recommended resistant or tolerant crop varieties.`;
    }
  }

  // G. FULL REPORT / GENERAL FALLBACK WITH TOPIC
  else if (topic && prof) {
    const visualBlock = visualText;
    const riskBlock = riskText;
    const actionsBlock = actionsList.map((a, i) => `${i + 1}. ${a}`).join("\\n");

    if (targetLang === "te") {
      responseText = `🌾 **${probName} నివేదిక & సమగ్ర యాజమాన్యం**:\\n\\n` +
        `🔍 **లక్షణాలు & గుర్తింపు**:\\n${visualBlock}\\n\\n` +
        `⚠️ **వ్యాప్తి & కారణాలు**:\\n${riskBlock}\\n\\n` +
        `🛠️ **చేపట్టాల్సిన తక్షణ చర్యలు**:\\n${actionsBlock}`;
    } else if (targetLang === "hi") {
      responseText = `🌾 **${probName} विश्लेषण और प्रबंधन योजना**:\\n\\n` +
        `🔍 **दृश्य लक्षण और पहचान**:\\n${visualBlock}\\n\\n` +
        `⚠️ **प्रसार और जैविक कारण**:\\n${riskBlock}\\n\\n` +
        `🛠️ **अनुशंसित प्रबंधन कदम**:\\n${actionsBlock}`;
    } else if (targetLang === "ta") {
      responseText = `🌾 **${probName} கள அறிக்கை**:\\n\\n` +
        `🔍 **அறிகுறிகள்**:\\n${visualBlock}\\n\\n` +
        `⚠️ **காரணங்கள்**:\\n${riskBlock}\\n\\n` +
        `🛠️ **மேலாண்மை முறைகள்**:\\n${actionsBlock}`;
    } else if (targetLang === "kn") {
      responseText = `🌾 **${probName} ವರದಿ ಮತ್ತು ನಿರ್ವಹಣೆ**:\\n\\n` +
        `🔍 **ರೋಗ ಲಕ್ಷಣಗಳು**:\\n${visualBlock}\\n\\n` +
        `⚠️ **ಹರಡುವಿಕೆ ಮತ್ತು ಕಾರಣಗಳು**:\\n${riskBlock}\\n\\n` +
        `🛠️ **ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮಗಳು**:\\n${actionsBlock}`;
    } else if (targetLang === "mr") {
      responseText = `🌾 **${probName} सविस्तर अहवाल व व्यवस्थापन**:\\n\\n` +
        `🔍 **रोग लक्षणे**:\\n${visualBlock}\\n\\n` +
        `⚠️ **प्रसार आणि कारणे**:\\n${riskBlock}\\n\\n` +
        `🛠️ **व्यवस्थापनाचे उपाय**:\\n${actionsBlock}`;
    } else {
      responseText = `🌾 **${probName} Diagnostic & Management Protocol**:\\n\\n` +
        `🔍 **Visual Pathology**:\\n${visualBlock}\\n\\n` +
        `⚠️ **Epidemiology & Risk**:\\n${riskBlock}\\n\\n` +
        `🛠️ **Recommended Action Plan**:\\n${actionsBlock}`;
    }
  }

  // H. GENERAL FALLBACK WITHOUT RECOGNIZED TOPIC
  else {
    if (targetLang === "te") {
      responseText = `నమస్కారం! నేను కిసాన్ ఏఐ (Llama 3.2 1B) వ్యవసాయ నిపుణుడను.\\n\\n` +
        `మీ వరి లేదా మిరప పంటలో కనిపించిన లక్షణాలను మరింత వివరంగా తెలియజేయండి:\\n` +
        `• **వరి**: అగ్గి తెగులు (బ్లాస్ట్), బ్యాక్టీరియా ఆకు ఎండు (BLB), గోధుమ మచ్చ, కాండం తొలిచే పురుగు, సుడిదోమ (BPH), లేదా ఆకు చుట్టు పురుగు.\\n` +
        `• **మిరప**: ఆకు ముడత (Leaf Curl), తామర పురుగులు (Thrips), నల్లి (Mites), తెల్లదోమ, కాయ కుళ్ళు (ఆంత్రక్నోస్), లేదా బూడిద తెగులు.\\n\\n` +
        `మీ ఫోన్ కెమెరాతో తీసిన ఆకు ఫోటోను స్కాన్ చేసి నేరుగా విశ్లేషించవచ్చు!`;
    } else if (targetLang === "hi") {
      responseText = `नमस्ते! मैं किसान एआई (Llama 3.2 1B) ऑन-डिवाइस कृषि सहायक हूँ।\\n\\n` +
        `कृपया बताएं कि आप अपने खेत में क्या लक्षण देख रहे हैं:\\n` +
        `• **धान**: ब्लास्ट, जीवाणु झुलसा (BLB), भूरा धब्बा, तना छेदक, भूरा फुदका (BPH), या पत्ती लपेटक।\\n` +
        `• **मिर्च**: पत्ती मरोड़िया (लीफ कर्ल), थ्रिप्स, माइट्स, सफेद मक्खी, फल सड़न (एंथ्रेक्नोज), या डाउनी/पाउडरी मिल्ड्यू।\\n\\n` +
        `आप किसी भी पत्ती का फोटो स्कैन करके सीधे मुझसे समाधान पूछ सकते हैं!`;
    } else if (targetLang === "ta") {
      responseText = `வணக்கம்! நான் கிசான் AI (Llama 3.2 1B) வேளாண்மை உதவியாளர்.\\n\\nஉங்கள் நெல் அல்லது மிளகாய் பயிரில் உள்ள அறிகுறிகளை விரிவாகக் குறிப்பிடுங்கள். புகைப்படத்தை ஸ்கேன் செய்தும் நீங்கள் என்னிடம் ஆலோசனை பெறலாம்!`;
    } else if (targetLang === "kn") {
      responseText = `ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್ AI (Llama 3.2 1B) ಕೃಷಿ ಸಲಹೆಗಾರ.\\n\\nನಿಮ್ಮ ಭತ್ತ ಅಥವಾ ಮೆಣಸಿನ ಬೆಳೆಯಲ್ಲಿ ಕಂಡುಬಂದ ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಸಿ ಅಥವಾ ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ನೇರವಾಗಿ ಪರಿಹಾರ ಪಡೆಯಿರಿ!`;
    } else if (targetLang === "mr") {
      responseText = `नमस्कार! मी किसान AI (Llama 3.2 1B) कृषी सल्लागार आहे.\\n\\nकृपया तुमच्या भात किंवा मिरची पिकावरील लक्षणे सविस्तर सांगा किंवा फोटो स्कॅन करून सल्ला मिळवा!`;
    } else {
      responseText = `Hello! I am your on-device KisanAI (Meta Llama 3.2 1B Instruct) Agricultural Assistant.\\n\\n` +
        `Please describe the symptoms in your field or ask about specific conditions:\\n` +
        `• **Rice**: Blast, BLB, Brown Spot, Stem Borer, Brown Planthopper, Leaf Folder, Gall Midge, Hispa, Tungro.\\n` +
        `• **Chilli**: Leaf Curl, Thrips, Mites, Whiteflies, Aphids, Anthracnose / Fruit Rot, Powdery Mildew, Cercospora Spot.\\n\\n` +
        `You can also scan a leaf photograph to analyze its visual pathology in real-time!`;
    }
  }

  return {
    model: "Llama-3.2-1B-Instruct",
    lang: targetLang,
    text: responseText,
    isMultimodal: Boolean(scanCtx?.topicSlug),
    safetyTriggered: false,
    refs,
  };
}
'''

full_text = head + new_tail
with open("src/features/crop-care/services/llama.ts", "w", encoding="utf-8") as f:
    f.write(full_text)

print("Successfully patched src/features/crop-care/services/llama.ts!")
