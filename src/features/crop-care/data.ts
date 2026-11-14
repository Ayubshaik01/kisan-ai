import chilliImage from "@/assets/chilli-field.jpg";
import riceImage from "@/assets/rice-field.jpg";

export type CropKey = "chilli" | "rice";
export type Severity = "Mild" | "Moderate" | "Severe" | "Not assessed";

export type CropCondition = {
  slug: string;
  name: string;
  category: "Disease" | "Pest";
  signs: string;
  firstStep: string;
  lookAt: string[];
  similarTo: string;
  getHelp: string;
};

export type CropGuide = {
  key: CropKey;
  name: string;
  subtitle: string;
  about: string;
  image: string;
  stages: { name: string; watch: string }[];
  weeklyChecks: string[];
  conditions: CropCondition[];
};

export const crops: CropGuide[] = [
  {
    key: "chilli",
    name: "Chilli",
    subtitle: "Leaf health, flowering & fruit",
    about:
      "Chilli rewards steady watering, good drainage and regular close looks. Many problems start small — on the underside of a leaf or a single fruit — so a few minutes of checking each week goes a long way.",
    image: chilliImage,
    stages: [
      { name: "Nursery", watch: "Damping off, weak or leggy seedlings." },
      { name: "Establishment", watch: "Wilting after transplant, gaps in rows." },
      { name: "Vegetative", watch: "Curling or mottled new leaves, small insects." },
      { name: "Flowering", watch: "Flower drop during heat or water stress." },
      { name: "Fruiting", watch: "Dark sunken spots or soft patches on fruit." },
    ],
    weeklyChecks: [
      "Turn over leaves on 5–10 plants and look for small insects or eggs.",
      "Look for curling, mottling or unusually small new leaves.",
      "Check fruit for dark, sunken or soft spots.",
      "Feel the soil — both waterlogging and dryness stress chilli.",
    ],
    conditions: [
      {
        slug: "leaf-curl",
        name: "Leaf curl",
        category: "Disease",
        signs: "Leaves may curl upward or downward, look smaller, and show yellowing or stunted growth.",
        firstStep:
          "Check several plants and inspect the undersides of leaves for tiny insects. Ask a local crop adviser to confirm the cause before treating.",
        lookAt: ["Youngest leaves at the growing tip", "Leaf undersides for small insects", "Whether affected plants are in patches or scattered"],
        similarTo: "Herbicide drift, water stress, nutrient problems and mite feeding can all cause curling.",
        getHelp: "If curling spreads to many plants within a week, or new growth stops, contact your local agriculture office.",
      },
      {
        slug: "anthracnose",
        name: "Anthracnose",
        category: "Disease",
        signs: "Dark, sunken spots can appear on chilli fruit, sometimes with small dark specks in damp weather.",
        firstStep: "Separate affected fruit, avoid wetting foliage, and seek locally verified advice if the marks spread.",
        lookAt: ["Ripening fruit, especially after rain", "Spots with rings or tiny dark dots", "Fruit touching the soil"],
        similarTo: "Sunscald and insect damage can leave marks that look similar on fruit.",
        getHelp: "If many fruits show spots during a wet spell, ask an extension worker before harvest decisions.",
      },
      {
        slug: "aphids-whiteflies",
        name: "Aphids & whiteflies",
        category: "Pest",
        signs: "Small insects may cluster beneath leaves; leaves can become sticky, pale, or curled.",
        firstStep: "Check leaf undersides on multiple plants and record whether numbers are increasing before deciding what to do.",
        lookAt: ["Leaf undersides and new shoots", "Sticky residue or black sooty film", "Tiny white insects that fly when disturbed"],
        similarTo: "Thrips and mites also cause pale, distorted leaves and are harder to see.",
        getHelp: "If insect numbers rise week after week, ask for local guidance on safe, approved control.",
      },
    ],
  },
  {
    key: "rice",
    name: "Rice",
    subtitle: "Leaves, stems & grain",
    about:
      "Rice changes quickly between stages, and the same symptom can mean different things at different times. Noting the crop stage and recent weather with every observation makes advice far more useful.",
    image: riceImage,
    stages: [
      { name: "Nursery", watch: "Yellowing seedlings, uneven growth." },
      { name: "Tillering", watch: "Leaf spots, dead central shoots." },
      { name: "Panicle initiation", watch: "Spots spreading on upper leaves." },
      { name: "Flowering", watch: "Neck lesions, empty or pale panicles." },
      { name: "Grain filling", watch: "Discoloured grain, lodging." },
    ],
    weeklyChecks: [
      "Walk a zig-zag path through the field, not only along the bund.",
      "Look at leaves from 10 hills for spots with pale centres.",
      "Check for dried central shoots or pale, empty panicles.",
      "Note water level, recent weather and crop stage.",
    ],
    conditions: [
      {
        slug: "rice-blast",
        name: "Rice blast",
        category: "Disease",
        signs: "Leaf spots can have a pale centre and darker, pointed edges. Symptoms vary with crop stage and weather.",
        firstStep: "Compare several leaves and note crop stage and recent weather. Confirm with a local extension worker before applying any treatment.",
        lookAt: ["Diamond-shaped spots on leaves", "Dark lesions at the panicle neck", "Patches after cool, humid nights"],
        similarTo: "Brown spot and other leaf spots can look alike, especially in photos.",
        getHelp: "If spots appear near flowering or on the panicle neck, seek local advice quickly.",
      },
      {
        slug: "brown-spot",
        name: "Brown spot",
        category: "Disease",
        signs: "Small brown spots may develop on leaves; other stresses can look similar in a photograph.",
        firstStep: "Check whether spots occur on several plants and review crop nutrition and water conditions with a trusted adviser.",
        lookAt: ["Round to oval brown spots", "Whether the field has nutrient or water stress", "Spots on grain husks later in the season"],
        similarTo: "Early blast lesions and nutrient deficiency can look similar.",
        getHelp: "If spots cover large parts of leaves across the field, ask your extension service about soil health.",
      },
      {
        slug: "stem-borer",
        name: "Stem borer",
        category: "Pest",
        signs: "A central shoot may dry, or a grain-bearing stem may turn pale; inspect the stem for signs of boring.",
        firstStep: "Look across the field for a pattern and inspect stems. Ask for local guidance before choosing a control method.",
        lookAt: ["Dried central shoots that pull out easily", "Small holes near the stem base", "Pale, empty panicles at heading"],
        similarTo: "Water stress and rodent damage can also cause dried tillers.",
        getHelp: "If many hills show dead shoots, ask for local advice on monitoring and approved control.",
      },
    ],
  },
];

export function getCrop(key: string): CropGuide | undefined {
  return crops.find((crop) => crop.key === key);
}

export function getCondition(cropKey: string, slug: string): { crop: CropGuide; condition: CropCondition } | undefined {
  const crop = getCrop(cropKey);
  const condition = crop?.conditions.find((item) => item.slug === slug);
  return crop && condition ? { crop, condition } : undefined;
}

export const allConditions = crops.flatMap((crop) => crop.conditions.map((condition) => ({ crop, condition })));

export const fieldTips = crops.flatMap((crop) => crop.weeklyChecks.map((tip) => ({ crop: crop.name, tip })));

export const localAnswers = [
  {
    keys: ["yellow", "chilli", "curl", "leaf"],
    answer:
      "Yellowing or curling chilli leaves can have several causes, including sap-feeding insects, virus-like symptoms, water stress, or nutrient problems. Check the underside of leaves on a few plants and compare affected with healthy plants. A photo alone cannot confirm the cause; ask a local crop adviser before treating.",
  },
  {
    keys: ["blast", "rice"],
    answer:
      "Rice blast can show pale-centred leaf spots with darker, pointed edges, but other problems may look similar. Check several leaves and note the crop stage and recent weather. Avoid acting on one photo alone; confirm with your local agricultural extension service.",
  },
  {
    keys: ["after", "diagnos", "photo", "scan"],
    answer:
      "Start by checking several plants, not only the photographed leaf. Note when symptoms began, whether they are spreading, and recent weather or field changes. This app's photo check is not connected to a disease-detection model yet, so use the crop guide and consult a local expert before treatment.",
  },
  {
    keys: ["pest", "insect", "protect"],
    answer:
      "Inspect both sides of leaves and look across several plants to see whether pests are present and increasing. Keep a simple dated note of what you find. Avoid pesticide decisions from a photo alone; follow locally verified advice and product labels if treatment is recommended.",
  },
  {
    keys: ["water", "irrigat", "dry"],
    answer:
      "Check soil moisture a few centimetres down before watering. Chilli dislikes waterlogging, while rice needs water levels suited to its stage. Note recent rain and how plants look in the early morning — wilting that recovers overnight usually points to heat or water stress.",
  },
  {
    keys: ["telugu", "తెలుగు"],
    answer:
      "మీ పంటలో లక్షణాలు ఒకటి కంటే ఎక్కువ మొక్కలపై ఉన్నాయో చూడండి. ఆకుల రెండు వైపులా పరిశీలించి, లక్షణాలు ఎప్పుడు మొదలయ్యాయో నమోదు చేయండి. ఈ ఫోటో సహాయకంలో నిర్ధారణ మోడల్ ఇంకా లేదు; చికిత్సకు ముందు స్థానిక వ్యవసాయ నిపుణుడిని సంప్రదించండి.",
  },
  {
    keys: ["hindi", "हिंदी"],
    answer:
      "कई पौधों पर लक्षण देखें और पत्तियों के दोनों तरफ जाँच करें। लक्षण कब शुरू हुए, यह लिखें। इस ऐप में अभी रोग-पहचान मॉडल उपलब्ध नहीं है; उपचार से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि करें।",
  },
];

export const suggestedQuestions = [
  "Why are my chilli leaves turning yellow?",
  "How can I check for rice blast?",
  "What should I do after taking a crop photo?",
  "How do I inspect my plants for pests?",
];

export function answerLocally(question: string): string {
  const lower = question.toLowerCase();
  const match = localAnswers.find((entry) => entry.keys.some((key) => lower.includes(key)));
  return (
    match?.answer ??
    "I can help with common chilli and rice leaf symptoms, field checks, and safe next steps using the guidance stored on this device. Try asking about chilli leaf curl, rice blast, yellow leaves, watering, or checking for pests. For a diagnosis or treatment, confirm with a local agricultural expert."
  );
}
