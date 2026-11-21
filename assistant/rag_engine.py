"""
Offline Retrieval-Augmented Generation (RAG) Assistant Engine
Combines user query + crop context + SQLite knowledge retrieval with
strict system instructions and safety filtering.
"""

import os
import sys
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from assistant.multilingual_knowledge import LABELS, MULTILINGUAL_CONDITIONS, get_condition_data
from assistant.safety.safety_checker import SafetyValidator
from knowledge.query_service import KnowledgeQueryService

SYSTEM_PROMPT = """You are Fieldnote AI, an expert agricultural assistant specifically helping farmers in Andhra Pradesh and Telangana care for rice and chilli crops.

STRICT OPERATIONAL RULES:
1. Ground your answers strictly in the retrieved agricultural records provided below.
2. NEVER invent pesticide brand names, chemical active ingredients, or unverified dosages.
3. If the user asks for chemical dosages or tank-mixing, state that verified CIB&RC records must be followed and advise them to consult their local Agricultural Officer or KVK.
4. Explain symptoms, causes, immediate cultural steps, and prevention in simple, clear, farmer-friendly terms.
5. Emphasize that one photograph evaluates visible damage on that plant only, not the entire field.
6. Support English, Hindi, and Telugu accurately.
"""


class OfflineAssistantRAG:
    def __init__(self):
        self.query_service = KnowledgeQueryService()
        self.safety_validator = SafetyValidator()

    def process_query(
        self,
        query: str,
        crop: Optional[str] = None,
        problem_slug: Optional[str] = None,
        region: str = "Andhra Pradesh",
        season: str = "kharif",
        lang: str = "en",
    ) -> Dict[str, Any]:
        """
        Executes complete RAG pipeline:
        1. Safety validation
        2. Knowledge retrieval from SQLite
        3. Context generation
        4. Structured answer composition
        """
        # Step 1: Safety Check
        is_safe, refusal = self.safety_validator.validate_query(query, lang=lang)
        if not is_safe:
            return {
                "answer": refusal,
                "sources": [
                    {
                        "institution": "CIB&RC / Department of Agriculture",
                        "title": "Statutory Chemical Safety & Pesticide Regulation Compliance",
                    }
                ],
                "safety_triggered": True,
                "referenced_problem": None,
            }

        # Step 2: Identify problem from slug or search
        target_problem = None
        if problem_slug:
            # Normalize slug aliases
            slug_key = problem_slug.replace("chilli-", "").replace("rice-", "")
            target_problem = self.query_service.get_problem(problem_slug) or self.query_service.get_problem(slug_key)
        
        if not target_problem:
            # Search query across problems
            matches = self.query_service.search_knowledge(query, crop_id=crop)
            if matches:
                target_problem = matches[0]

        # Multi-lingual keyword fallback for Indian regional queries
        if not target_problem:
            q_low = query.lower()
            # Thrips
            if any(k in q_low for k in ["thrips", "తామర", "थ्रिप्स", "இலைப்பேன்", "தாம்பிர பூச்சி", "ನುಸಿ", "फुलकिडे"]):
                target_problem = self.query_service.get_problem("thrips")
            # Leaf Curl
            elif any(k in q_low for k in ["leaf curl", "ముడత", "चुरडा", "मुरडा", "बोकड्या", "இலை சுருட்டை", "இலைச்சுருள்", "ಎಲೆ ಮುರುಟು", "ಮುರುಟು"]):
                target_problem = self.query_service.get_problem("leaf-curl")
            # Blast
            elif any(k in q_low for k in ["blast", "అగ్గి తెగులు", "అగ్గి", "ब्लास्ट", "झुलसा", "குலை நோய்", "குலை", "பிளாஸ்ட்", "ಬೆಂಕಿ ರೋಗ", "ಬೆಂಕಿ", "ಬ್ಲಾಸ್ಟ್", "करपा", "तांदूळ करपा"]):
                target_problem = self.query_service.get_problem("rice-blast")
            # Brown Spot
            elif any(k in q_low for k in ["brown spot", "మచ్చ", "ఆకు మచ్చ", "भूरा धब्बा", "धब्बा", "பழுப்பு புள்ளி", "புள்ளி", "ಕಂದು ಚುಕ್ಕೆ", "ಚುಕ್ಕೆ", "तपकिरी ठिपके", "ठिपके"]):
                target_problem = self.query_service.get_problem("brown-spot")
            # Bacterial Leaf Blight
            elif any(k in q_low for k in ["blight", "bacterial leaf blight", "ఎండ తెగులు", "జీవాణు తెగులు", "जीवाणु झुलसा", "झुलसा", "இலைக்கருகல்", "பாக்டீரியா இலைக்கருகல்", "ಅಂಗಮಾರಿ", "ದುಂಡಾಣು ಅಂಗಮಾರಿ", "जीवाणूजन्य करपा"]):
                target_problem = self.query_service.get_problem("bacterial-leaf-blight")
            # Stem Borer
            elif any(k in q_low for k in ["stem borer", "yellow stem borer", "కాండం తొలుచు", "పురుగు", "तना छेदक", "தண்டு துளைப்பான்", "ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು", "खोडकीड"]):
                target_problem = self.query_service.get_problem("yellow-stem-borer")
            # Fertilizer references
            elif any(k in q_low for k in ["potash", "urea", "यूरिया", "యూరియా", "யூரியா", "ಯೂರಿಯಾ", "युरिया", "fertilizer", "खाद", "ఎరువు", "உரம்", "ಗೊಬ್ಬರ"]):
                target_problem = self.query_service.get_problem("brown-spot") if crop == "rice" else self.query_service.get_problem("rice-blast")

        if not target_problem:
            if lang == "hi":
                fallback_msg = "मुझे गाइड में धान या मिर्च की इस समस्या का विवरण नहीं मिला। कृपया पत्ती पर दिख रहे लक्षण बताएं जैसे 'पत्ती पर भूरे धब्बे' या 'मिर्च की मुड़ती पत्तियां'।"
            elif lang == "te":
                fallback_msg = "ఈ ప్రశ్నకు సంబంధించిన వరి లేదా మిరప సమస్య గైడ్‌లో లభించలేదు. దయచేసి 'వరి ఆకులపై మచ్చలు' లేదా 'మిరప ఆకు ముడత' వంటి లక్షణాలను పేర్కొనండి."
            elif lang == "ta":
                fallback_msg = "வழிகாட்டியில் நெல் அல்லது மிளகாய் பயிரின் இந்த பிரச்சனை கிடைக்கவில்லை. தயவுசெய்து 'இலைகளில் பழுப்பு புள்ளிகள்' அல்லது 'இலை சுருட்டை' போன்ற அறிகுறிகளை விவரிக்கவும்."
            elif lang == "kn":
                fallback_msg = "ಮಾರ್ಗದರ್ಶಿಯಲ್ಲಿ ಭತ್ತ ಅಥವಾ ಮೆಣಸಿನಕಾಯಿಯ ಈ ಸಮಸ್ಯೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು 'ಎಲೆಗಳ ಮೇಲೆ ಕಂದು ಚುಕ್ಕೆಗಳು' ಅಥವಾ 'ಎಲೆ ಮುರುಟು' ನಂತಹ ಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ."
            elif lang == "mr":
                fallback_msg = "मार्गदर्शकामध्ये भात किंवा मिरचीच्या या समस्येचा तपशील आढळला नाही. कृपया 'पानावरील तपकिरी ठिपके' किंवा 'पाने चुरडणे' यासारखी लक्षणे सांगा."
            else:
                fallback_msg = "I couldn't match that to a rice or chilli problem in the verified offline guide. Try describing what you see on the leaves, panicle or fruit."
            return {
                "answer": fallback_msg,
                "sources": [],
                "safety_triggered": False,
                "referenced_problem": None,
            }

        # Step 3: Retrieve Advisory, Treatments & Sources
        prob_id = target_problem["problem_id"]
        advisory = self.query_service.get_advisory(prob_id, region=region, season=season, language=lang)
        treatments = self.query_service.get_treatments(prob_id)
        sources = self.query_service.get_sources(prob_id)

        # Step 4: Compose 100% Native Vernacular Answer
        parts = []
        cond_data = get_condition_data(prob_id, lang=lang)

        if cond_data:
            parts.append(cond_data["header"])
            parts.append(cond_data["symptoms"])
            parts.append(cond_data["parts"])
            parts.append(cond_data["immediate"])
            parts.append(cond_data["prevention"])
            parts.append(cond_data["monitoring"])
            parts.append(cond_data["biological"])
            parts.append(cond_data["cultural"])
        else:
            # Fallback for unmapped conditions
            name = target_problem["problem_name"]
            sci = target_problem.get("scientific_name", "")
            lbl = LABELS.get(lang, LABELS["en"])
            parts.append(lbl["header"].format(name=name, scientific=sci))
            parts.append(f"{lbl['symptoms']}{target_problem.get('symptoms', '')}")
            parts.append(f"{lbl['parts']}{target_problem.get('affected_parts', '')}")
            if advisory:
                parts.append(f"{lbl['immediate']}{advisory.get('immediate_actions', '')}")
                parts.append(f"{lbl['prevention']}{advisory.get('preventive_actions', '')}")
                parts.append(f"{lbl['monitoring']}{advisory.get('monitoring_guidance', '')}")

        answer = "\n".join(parts)

        # Safety verification on generated response
        is_resp_safe, final_answer = self.safety_validator.validate_response(answer, lang=lang)

        return {
            "answer": final_answer,
            "sources": sources,
            "safety_triggered": not is_resp_safe,
            "referenced_problem": target_problem,
            "fallback_level": advisory.get("fallback_level") if advisory else None,
        }


if __name__ == "__main__":
    rag = OfflineAssistantRAG()
    res = rag.process_query("What should I do about rice blast?", crop="rice", lang="en")
    print("Answer:")
    print(res["answer"])
    print("\nSources:", len(res["sources"]))
