package org.cropcare.ai.bridge

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.cropcare.ai.inference.LlamaInferenceService
import org.cropcare.ai.inference.VisionInferenceService
import org.cropcare.ai.safety.SafetyValidationService
import org.cropcare.ai.severity.SeverityAnalysisService
import org.json.JSONArray
import org.json.JSONObject

class CropAssistantNativeBridge(
    private val context: Context,
    private val webView: WebView
) {
    private val scope = CoroutineScope(Dispatchers.Main)
    private val visionService = VisionInferenceService(context)
    private val llamaService = LlamaInferenceService(context)
    private val severityService = SeverityAnalysisService()
    private val safetyService = SafetyValidationService()

    init {
        // Pre-warm services on startup
        scope.launch(Dispatchers.IO) {
            visionService.initialize()
            llamaService.initialize()
        }
    }

    /**
     * Injects the Promise-based window.CropAssistantNative bridge object into the DOM.
     */
    fun injectShim() {
        val shimScript = """
            (function() {
                if (window.CropAssistantNative) return;
                window.CropAssistantNative = {
                    diagnose: function(input) {
                        return new Promise(function(resolve, reject) {
                            try {
                                var resJson = window.CropAssistantAndroid.diagnoseSync(JSON.stringify(input));
                                resolve(JSON.parse(resJson));
                            } catch (e) {
                                reject(e);
                            }
                        });
                    },
                    ask: function(input) {
                        return new Promise(function(resolve, reject) {
                            try {
                                var ans = window.CropAssistantAndroid.askSync(JSON.stringify(input));
                                resolve(ans);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    },
                    status: function() {
                        return new Promise(function(resolve, reject) {
                            try {
                                var resJson = window.CropAssistantAndroid.statusSync();
                                resolve(JSON.parse(resJson));
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }
                };
            })();
        """.trimIndent()

        webView.evaluateJavascript(shimScript, null)
    }

    @JavascriptInterface
    fun diagnoseSync(payloadJson: String): String {
        return try {
            val input = JSONObject(payloadJson)
            val crop = input.getString("crop")
            val mode = input.getString("mode")
            val imageDataUrl = input.getString("imageDataUrl")

            val bitmap = decodeBase64Image(imageDataUrl)
                ?: return JSONObject().apply {
                    put("slug", JSONObject.NULL)
                    put("confidence", 0.0)
                    put("error", "Failed to decode image")
                }.toString()

            val diagResult = visionService.classifyImage(crop, bitmap)
            val slug = diagResult.slug
            val confidence = diagResult.confidence

            val response = JSONObject()
            if (slug == null || confidence < 0.55) {
                response.put("slug", JSONObject.NULL)
                response.put("confidence", confidence)
            } else {
                response.put("slug", slug)
                response.put("confidence", confidence)

                // Run computer vision severity calculation if it's a disease
                val severity = severityService.calculateSeverity(crop, slug, bitmap)
                val sevObj = JSONObject().apply {
                    put("affectedPercent", severity.affectedPercent)
                    put("stage", severity.stage)
                    put("headline", severity.headline)
                    put("urgency", severity.urgency)
                    put("rationale", severity.rationale)
                }
                response.put("severity", sevObj)
            }

            response.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("slug", JSONObject.NULL)
                put("confidence", 0.0)
                put("error", e.message)
            }.toString()
        }
    }

    @JavascriptInterface
    fun askSync(payloadJson: String): String {
        return try {
            val input = JSONObject(payloadJson)
            val question = input.getString("question")
            val lang = input.optString("lang", "en")
            val context = input.optString("context", "")

            // 1. Enforce statutory safety check
            val safetyResult = safetyService.validateQuery(question, lang)
            if (!safetyResult.isSafe) {
                return safetyResult.refusalMessage
            }

            // 2. Format with Llama 3.2 Instruct prompt structure
            val systemPrompt = when (lang) {
                "te" -> "మీరు పరికరంలోని Llama 3.2 వ్యవసాయ సహాయకుడు (1B Instruct). అధికారిక పరిశోధనా రికార్డుల ఆధారంగా రైతుకు స్పష్టమైన సమాధానాన్ని తెలుగులో అందించండి."
                "hi" -> "आप ऑन-डिवाइस Llama 3.2 कृषि विशेषज्ञ (1B Instruct) हैं। आधिकारिक कृषि अनुसंधान के आधार पर किसान को व्यावहारिक समाधान प्रदान करें।"
                else -> "You are the on-device Llama 3.2 Agricultural Assistant (1B Instruct). Ground answers in verified agronomic records and provide actionable non-hazardous advice."
            }
            val llamaPrompt = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n$systemPrompt<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n$question\n[Context: $context]<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"

            // 3. Generate response using Llama on-device engine
            val answer = llamaService.generateResponse(llamaPrompt, lang)
            safetyService.validateResponse(answer, lang)
        } catch (e: Exception) {
            "An error occurred while processing the inquiry."
        }
    }

    @JavascriptInterface
    fun statusSync(): String {
        val array = JSONArray()

        array.put(JSONObject().apply {
            put("name", "Llama 3.2 1B Instruct (On-Device LLM)")
            put("type", "Language / Multimodal")
            put("status", if (llamaService.isReady()) "Ready" else "Active")
            put("details", "4-bit quantized ExecuTorch engine supporting English, Hindi, and Telugu.")
        })

        array.put(JSONObject().apply {
            put("name", "MobileNetV3-Small (Rice Classifier)")
            put("type", "Vision")
            put("status", if (visionService.isRiceLoaded()) "Ready" else "Standby")
            put("details", "Quantized TorchScript / ExecuTorch model running on-device.")
        })

        array.put(JSONObject().apply {
            put("name", "MobileNetV3-Small (Chilli Classifier)")
            put("type", "Vision")
            put("status", if (visionService.isChilliLoaded()) "Ready" else "Standby")
            put("details", "Quantized TorchScript / ExecuTorch model running on-device.")
        })

        array.put(JSONObject().apply {
            put("name", "Agricultural Knowledge DB")
            put("type", "Database")
            put("status", "Active")
            put("details", "SQLite 3 engine containing ICAR, ANGRAU, and PJTSAU advisory records.")
        })

        array.put(JSONObject().apply {
            put("name", "CIB&RC Statutory Safety Validator")
            put("type", "Safety")
            put("status", "Enforcing")
            put("details", "Strictly intercepts unapproved dosages, mixing, and chemical hazards.")
        })

        return array.toString()
    }

    private fun decodeBase64Image(dataUrl: String): Bitmap? {
        val base64 = if (dataUrl.contains(",")) {
            dataUrl.substring(dataUrl.indexOf(",") + 1)
        } else {
            dataUrl
        }
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }
}

