"""
Offline Retrieval-Augmented Generation (RAG) Assistant Engine
Combines user query + crop context + SQLite knowledge retrieval with
strict system instructions and safety filtering.
"""

import os
import sys
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
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
            if "thrips" in q_low or "తామర" in q_low:
                target_problem = self.query_service.get_problem("thrips")
            elif "leaf curl" in q_low or "ముడత" in q_low or "चुरडा" in q_low or "मुरडा" in q_low:
                target_problem = self.query_service.get_problem("leaf-curl")
            elif "blast" in q_low or "అగ్గి తెగులు" in q_low or "ब्लास्ट" in q_low:
                target_problem = self.query_service.get_problem("rice-blast")
            elif "brown spot" in q_low or "మచ్చ" in q_low or "भूरा धब्बा" in q_low:
                target_problem = self.query_service.get_problem("brown-spot")
            elif "blight" in q_low or "ఎండ తెగులు" in q_low or "झुलसा" in q_low:
                target_problem = self.query_service.get_problem("bacterial-leaf-blight")
            elif "potash" in q_low or "urea" in q_low or "यूरिया" in q_low or "యూరియా" in q_low or "fertilizer" in q_low:
                target_problem = self.query_service.get_problem("brown-spot") if crop == "rice" else self.query_service.get_problem("rice-blast")

        if not target_problem:
            if lang == "hi":
                fallback_msg = "मुझे गाइड में धान या मिर्च की इस समस्या का विवरण नहीं मिला। कृपया पत्ती पर दिख रहे लक्षण बताएं जैसे 'पत्ती पर भूरे धब्बे' या 'मिर्च की मुड़ती पत्तियां'।"
            elif lang == "te":
                fallback_msg = "ఈ ప్రశ్నకు సంబంధించిన వరి లేదా మిరప సమస్య గైడ్‌లో లభించలేదు. దయచేసి 'వరి ఆకులపై మచ్చలు' లేదా 'మిరప ఆకు ముడత' వంటి లక్షణాలను పేర్కొనండి."
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

        # Step 4: Compose Answer
        parts = []
        name = target_problem["problem_name"]
        sci = target_problem.get("scientific_name", "")

        # Regional vernacular localized names
        telugu_names = {
            "Rice Blast": "వరి అగ్గి తెగులు",
            "Brown Spot": "వరి ఆకుమచ్చ తెగులు",
            "Bacterial Leaf Blight": "వరి బ్యాక్టీరియా ఎండ తెగులు",
            "Chilli Thrips": "మిరప తామర పురుగులు",
            "Chilli Leaf Curl Virus": "మిరప ఆకు ముడత వైరస్",
        }
        hindi_names = {
            "Rice Blast": "धान का झुलसा (ब्लास्ट) रोग",
            "Brown Spot": "धान का भूरा धब्बा रोग",
            "Bacterial Leaf Blight": "धान का जीवाणु झुलसा रोग",
            "Chilli Thrips": "मिर्च का थ्रिप्स कीट",
            "Chilli Leaf Curl Virus": "मिर्च का पर्ण कुंचन (मुरड़ा) रोग",
        }

        if lang == "hi":
            h_name = hindi_names.get(name, name)
            parts.append(f"सत्यापित कृषि गाइड — {h_name} ({sci}):\n")
            parts.append(f"• मुख्य लक्षण: {target_problem['symptoms']}")
            parts.append(f"• प्रभावित भाग: {target_problem['affected_parts']}")
            if advisory:
                parts.append(f"• तत्काल कदम: {advisory['immediate_actions']}")
                parts.append(f"• रोकथाम के उपाय: {advisory['preventive_actions']}")
                parts.append(f"• निगरानी: {advisory['monitoring_guidance']}")
        elif lang == "te":
            t_name = telugu_names.get(name, name)
            parts.append(f"ధృవీకరించిన వ్యవసాయ గైడ్ — {t_name} ({sci}):\n")
            parts.append(f"• ప్రధాన లక్షణాలు: {target_problem['symptoms']}")
            parts.append(f"• ప్రభావిత భాగాలు: {target_problem['affected_parts']}")
            if advisory:
                parts.append(f"• తక్షణ చర్యలు: {advisory['immediate_actions']}")
                parts.append(f"• నివారణ చర్యలు: {advisory['preventive_actions']}")
                parts.append(f"• క్షేత్ర పరిశీలన: {advisory['monitoring_guidance']}")
        else:
            parts.append(f"From the verified agricultural guide on {name} ({sci}):\n")
            parts.append(f"• Symptoms: {target_problem['symptoms']}")
            parts.append(f"• Affected parts: {target_problem['affected_parts']}")
            if advisory:
                parts.append(f"• What to do immediately: {advisory['immediate_actions']}")
                parts.append(f"• Preventive practices: {advisory['preventive_actions']}")
                parts.append(f"• Monitoring: {advisory['monitoring_guidance']}")

        # Cultural, mechanical, and biological practices
        for t in treatments:
            ttype = t.get("treatment_type", "management").capitalize()
            meth = t.get("product_or_method", "")
            dose = t.get("approved_dose", "")
            if dose:
                parts.append(f"• {ttype} management: {meth} ({dose})")
            else:
                parts.append(f"• {ttype} management: {meth}")

        if prob_id == "thrips":
            parts.append("• Mechanical & Biological management: Install blue or yellow sticky traps (15–20/acre); spray Neem oil 1500 ppm or NSKE 5%.")
        elif prob_id == "leaf-curl":
            parts.append("• Vector & Biological management: Set up yellow sticky traps for whiteflies; spray Neem extract or Beauveria bassiana.")

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
