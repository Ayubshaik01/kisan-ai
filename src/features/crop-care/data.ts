import chilliImage from "@/assets/chilli-field.jpg";
import riceImage from "@/assets/rice-field.jpg";

export type CropKey = "chilli" | "rice";
export type Severity = "Mild" | "Moderate" | "Severe" | "Not assessed";

export type CropGuide = {
  key: CropKey;
  name: string;
  subtitle: string;
  image: string;
  conditions: { name: string; signs: string; firstStep: string; category: "Disease" | "Pest" }[];
};

export const crops: CropGuide[] = [
  {
    key: "chilli",
    name: "Chilli",
    subtitle: "Leaf health, fruiting & common field concerns",
    image: chilliImage,
    conditions: [
      {
        name: "Leaf curl",
        category: "Disease",
        signs: "Leaves may curl upward or downward, look smaller, and show yellowing or stunted growth.",
        firstStep: "Check several plants and inspect the undersides of leaves for tiny insects. Ask a local crop adviser to confirm the cause before treating.",
      },
      {
        name: "Anthracnose",
        category: "Disease",
        signs: "Dark, sunken spots can appear on chilli fruit, sometimes with small dark specks in damp weather.",
        firstStep: "Separate affected fruit, avoid wetting foliage, and seek locally verified advice if the marks spread.",
      },
      {
        name: "Aphids & whiteflies",
        category: "Pest",
        signs: "Small insects may cluster beneath leaves; leaves can become sticky, pale, or curled.",
        firstStep: "Check leaf undersides on multiple plants and record whether numbers are increasing before deciding what to do.",
      },
    ],
  },
  {
    key: "rice",
    name: "Rice",
    subtitle: "Leaf symptoms, crop stage & field checks",
    image: riceImage,
    conditions: [
      {
        name: "Rice blast",
        category: "Disease",
        signs: "Leaf spots can have a pale centre and darker, pointed edges. Symptoms vary with crop stage and weather.",
        firstStep: "Compare several leaves and note crop stage and recent weather. Confirm with a local extension worker before applying any treatment.",
      },
      {
        name: "Brown spot",
        category: "Disease",
        signs: "Small brown spots may develop on leaves; other stresses can look similar in a photograph.",
        firstStep: "Check whether spots occur on several plants and review crop nutrition and water conditions with a trusted adviser.",
      },
      {
        name: "Stem borer",
        category: "Pest",
        signs: "A central shoot may dry, or a grain-bearing stem may turn pale; inspect the stem for signs of boring.",
        firstStep: "Look across the field for a pattern and inspect stems. Ask for local guidance before choosing a control method.",
      },
    ],
  },
];

export const localAnswers = [
  {
    keys: ["yellow", "chilli", "curl", "leaf"],
    answer: "Yellowing or curling chilli leaves can have several causes, including sap-feeding insects, virus-like symptoms, water stress, or nutrient problems. Check the underside of leaves on a few plants and compare affected with healthy plants. A photo alone cannot confirm the cause; ask a local crop adviser before treating.",
  },
  {
    keys: ["blast", "rice"],
    answer: "Rice blast can show pale-centred leaf spots with darker, pointed edges, but other problems may look similar. Check several leaves and note the crop stage and recent weather. Avoid acting on one photo alone; confirm with your local agricultural extension service.",
  },
  {
    keys: ["after", "diagnos", "photo", "scan"],
    answer: "Start by checking several plants, not only the photographed leaf. Note when symptoms began, whether they are spreading, and recent weather or field changes. This app's photo check is not connected to a disease-detection model yet, so use the crop guide and consult a local expert before treatment.",
  },
  {
    keys: ["pest", "insect", "protect"],
    answer: "Inspect both sides of leaves and look across several plants to see whether pests are present and increasing. Keep a simple dated note of what you find. Avoid pesticide decisions from a photo alone; follow locally verified advice and product labels if treatment is recommended.",
  },
  {
    keys: ["telugu", "తెలుగు"],
    answer: "మీ పంటలో లక్షణాలు ఒకటి కంటే ఎక్కువ మొక్కలపై ఉన్నాయో చూడండి. ఆకుల రెండు వైపులా పరిశీలించి, లక్షణాలు ఎప్పుడు మొదలయ్యాయో నమోదు చేయండి. ఈ ఫోటో సహాయకంలో నిర్ధారణ మోడల్ ఇంకా లేదు; చికిత్సకు ముందు స్థానిక వ్యవసాయ నిపుణుడిని సంప్రదించండి.",
  },
  {
    keys: ["hindi", "हिंदी"],
    answer: "कई पौधों पर लक्षण देखें और पत्तियों के दोनों तरफ जाँच करें। लक्षण कब शुरू हुए, यह लिखें। इस ऐप में अभी रोग-पहचान मॉडल उपलब्ध नहीं है; उपचार से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि करें।",
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
  return match?.answer ?? "I can help with common chilli and rice leaf symptoms, field checks, and safe next steps using the guidance stored on this device. Try asking about chilli leaf curl, rice blast, yellow leaves, or checking for pests. For a diagnosis or treatment, confirm with a local agricultural expert.";
}