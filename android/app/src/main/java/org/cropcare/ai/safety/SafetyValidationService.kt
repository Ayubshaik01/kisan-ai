package org.cropcare.ai.safety

import java.util.regex.Pattern

data class SafetyCheckResult(
    val isSafe: Boolean,
    val refusalMessage: String
)

class SafetyValidationService {

    private val chemicalPatterns = listOf(
        Pattern.compile("\\b(?:dose|dosage|concentration|dilution|mixing ratio|spray interval)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:how much|how many)\\s+(?:to spray|to mix|of chemical|chemical|pesticide|fungicide|insecticide)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:how much|how many)\\b.*\\b(?:per\\s+(?:acre|ha|hectare|pump|litre|liter|knapsack|sprayer)|to\\s+spray|to\\s+mix|in\\s+\\d+\\s*(?:l|litre|liter|pump)|dissolve in water)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:ml|g|gm|grams?|kg|litres?)\\b.*\\b(?:/|per|in a|in \\d+|in)\\s*(?:l|litre|liter|acre|ha|hectare|pump|knapsack)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:double (?:the )?dose|twice (?:the )?dose|increase (?:the )?dose|higher dose|exceed (?:the )?package dose)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:double dosage|double (?:the )?fungicide dose|double dose)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:mix|tank mix|combine|triple mix)\\b.*\\b(?:with|and|in the same tank|together|in one|chemicals?|pesticides?|fungicides?|formula)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:triple mix|tank mix|chemical mix|leftover pesticide)\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\b(?:pesticide|fungicide|insecticide|chemical spray)\\s*(?:dose|dosage|schedule|spray)\\b", Pattern.CASE_INSENSITIVE),
        // Hindi keywords
        Pattern.compile("(?:दवा|कीटनाशक|फफूंदनाशी|छिड़काव|मात्रा|डोज़|कितना मिला|दोगुना|मिलाकर)"),
        // Telugu keywords
        Pattern.compile("(?:మందు|పురుగుమందు|తెగులుమందు|పిచికారీ|మోతాదు|ఎంత కలపాలి|డబుల్ మోతాదు|రెండు కలిపి)")
    )

    private val safeRefusals = mapOf(
        "en" to "Specific chemical dosages, pesticide brand names, or chemical tank-mixing instructions cannot be recommended directly by this AI. Under CIB&RC statutory regulations, chemical crop-protection products must strictly adhere to officially approved regional registrations. Please follow the cultural and biological controls provided, or consult your local Agricultural Officer or Krishi Vigyan Kendra (KVK) for officially approved chemical schedules.",
        "hi" to "यह एआई कीटनाशक या फफूंदनाशी के नाम, मात्रा (डोज़) या रसायनों को मिलाकर छिड़कने की सलाह नहीं दे सकता। केंद्रीय कीटनाशी बोर्ड (CIB&RC) के नियमों के अनुसार केवल आधिकारिक रूप से अनुमोदित सिफारिशों का ही उपयोग किया जाना चाहिए। कृपया जैविक व कृषि प्रबंधन के तरीके अपनाएं या अपने स्थानीय कृषि अधिकारी/केवीके से सलाह लें।",
        "te" to "పురుగుమందుల పేర్లు, పిచికారీ మోతాదులు లేదా రసాయనాల మిశ్రమం గురించి ఈ ఏఐ నేరుగా సిఫార్సు చేయదు. CIB&RC నిబంధనల ప్రకారం ధృవీకరించిన ప్రాంతీయ రికార్డుల నుండి మాత్రమే రసాయన సిఫార్సులు రావాలి. దయచేసి అందించిన సమగ్ర సస్యరక్షణ చర్యలను పాటించండి లేదా మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) లేదా వ్యవసాయ అధికారిని సంప్రదించండి."
    )

    fun validateQuery(query: String, lang: String = "en"): SafetyCheckResult {
        for (pattern in chemicalPatterns) {
            if (pattern.matcher(query).find()) {
                val refusal = safeRefusals[lang] ?: safeRefusals["en"]!!
                return SafetyCheckResult(isSafe = false, refusalMessage = refusal)
            }
        }
        return SafetyCheckResult(isSafe = true, refusalMessage = "")
    }

    fun validateResponse(response: String, lang: String = "en"): String {
        val dosageLeakPattern = Pattern.compile("\\b\\d+(?:\\.\\d+)?\\s*(?:ml|gm|g|kg)\\s*/\\s*(?:l|litre|liter|acre|ha)\\b", Pattern.CASE_INSENSITIVE)
        if (dosageLeakPattern.matcher(response).find()) {
            return safeRefusals[lang] ?: safeRefusals["en"]!!
        }
        return response
    }
}

