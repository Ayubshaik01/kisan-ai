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
            target_problem = self.query_service.get_problem(problem_slug)
        else:
            # Search query across problems
            matches = self.query_service.search_knowledge(query, crop_id=crop)
            if matches:
                target_problem = matches[0]

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

        if lang == "hi":
            parts.append(f"सत्यापित कृषि गाइड — {name} ({sci}):\n")
            parts.append(f"• मुख्य लक्षण: {target_problem['symptoms']}")
            parts.append(f"• प्रभावित भाग: {target_problem['affected_parts']}")
            if advisory:
                parts.append(f"• तत्काल कदम: {advisory['immediate_actions']}")
                parts.append(f"• रोकथाम के उपाय: {advisory['preventive_actions']}")
                parts.append(f"• निगरानी: {advisory['monitoring_guidance']}")
        elif lang == "te":
            parts.append(f"ధృవీకరించిన వ్యవసాయ గైడ్ — {name} ({sci}):\n")
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

        # Cultural and biological practices
        cultural = [t["product_or_method"] for t in treatments if t["treatment_type"] == "cultural"]
        if cultural:
            parts.append(f"• Cultural management: {'; '.join(cultural)}")

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
