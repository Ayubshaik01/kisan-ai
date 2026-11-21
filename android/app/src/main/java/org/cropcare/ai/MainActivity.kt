package org.cropcare.ai

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.cropcare.ai.bridge.CropAssistantNativeBridge
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var nativeBridge: CropAssistantNativeBridge

    private val PERMISSION_REQUEST_CODE = 101
    private val FILE_CHOOSER_REQUEST_CODE = 102

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )

    private fun checkAndRequestPermissions() {
        val missingPermissions = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missingPermissions.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }
    }

    private fun createImageFileUri(): Uri? {
        return try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val imageFileName = "JPEG_${timeStamp}_"
            val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            val imageFile = File.createTempFile(imageFileName, ".jpg", storageDir)
            FileProvider.getUriForFile(this, "${applicationContext.packageName}.fileprovider", imageFile)
        } catch (e: Exception) {
            Log.e("MainActivity", "Error creating image file for camera intent", e)
            null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        checkAndRequestPermissions()

        webView = findViewById(R.id.webView)
        nativeBridge = CropAssistantNativeBridge(this, webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setGeolocationEnabled(true)
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            mediaPlaybackRequiresUserGesture = false
            userAgentString = "${userAgentString} KisanAI-Android/1.0"
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                // Grant camera & audio capture permissions for WebRTC & Web Speech
                runOnUiThread {
                    request.grant(request.resources)
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d("KisanAI-WebView", "[${consoleMessage.messageLevel()}] ${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                cameraImageUri = createImageFileUri()
                if (cameraImageUri != null) {
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                }

                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }

                val intentArray: Array<Intent> = if (cameraImageUri != null && packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
                    arrayOf(takePictureIntent)
                } else {
                    emptyArray()
                }

                val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                    putExtra(Intent.EXTRA_TITLE, "Select Leaf Image or Take Photo")
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)
                }

                try {
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE)
                    return true
                } catch (e: Exception) {
                    Log.e("MainActivity", "Cannot open file chooser", e)
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }
            }
        }

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val uri = request.url

                // 1. First delegate to WebViewAssetLoader
                val loaderResponse = assetLoader.shouldInterceptRequest(uri)
                if (loaderResponse != null) {
                    return loaderResponse
                }

                // 2. Handle virtual domain and SPA routing for offline single-page-app
                if (uri.host == "appassets.androidplatform.net") {
                    val path = uri.path ?: "/"

                    // Any navigation route without a dot extension, root "/", or index.html is an SPA route: serve dist/index.html
                    if (path == "/" || path.isEmpty() || path == "/index.html" || !path.substringAfterLast("/").contains(".")) {
                        return try {
                            val stream = assets.open("dist/index.html")
                            WebResourceResponse("text/html", "UTF-8", stream)
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Error serving SPA index.html for path: $path", e)
                            null
                        }
                    }

                    // Otherwise attempt to serve the requested asset directly from dist or assets
                    val cleanPath = when {
                        path.startsWith("/assets/dist/") -> path.removePrefix("/assets/")
                        path.startsWith("/assets/") -> path.removePrefix("/assets/")
                        path.startsWith("/dist/") -> path.removePrefix("/")
                        else -> "dist" + (if (path.startsWith("/")) path else "/$path")
                    }

                    return try {
                        val stream = assets.open(cleanPath)
                        val mimeType = when {
                            cleanPath.endsWith(".html") -> "text/html"
                            cleanPath.endsWith(".js") || cleanPath.endsWith(".mjs") -> "application/javascript"
                            cleanPath.endsWith(".css") -> "text/css"
                            cleanPath.endsWith(".json") -> "application/json"
                            cleanPath.endsWith(".png") -> "image/png"
                            cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg") -> "image/jpeg"
                            cleanPath.endsWith(".svg") -> "image/svg+xml"
                            cleanPath.endsWith(".wasm") -> "application/wasm"
                            cleanPath.endsWith(".onnx") -> "application/octet-stream"
                            else -> "application/octet-stream"
                        }
                        WebResourceResponse(mimeType, "UTF-8", stream)
                    } catch (e: Exception) {
                        Log.w("MainActivity", "Asset not found: $cleanPath, falling back to index.html for SPA", e)
                        try {
                            val stream = assets.open("dist/index.html")
                            WebResourceResponse("text/html", "UTF-8", stream)
                        } catch (fallbackEx: Exception) {
                            null
                        }
                    }
                }

                return null
            }

            @Deprecated("Deprecated in Java")
            override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? {
                val uri = Uri.parse(url)
                val loaderResponse = assetLoader.shouldInterceptRequest(uri)
                if (loaderResponse != null) return loaderResponse
                if (uri.host == "appassets.androidplatform.net") {
                    val path = uri.path ?: "/"
                    if (path == "/" || !path.substringAfterLast("/").contains(".")) {
                        return try {
                            val stream = assets.open("dist/index.html")
                            WebResourceResponse("text/html", "UTF-8", stream)
                        } catch (e: Exception) {
                            null
                        }
                    }
                }
                return null
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                // Let internal virtual assets remain within WebView
                if (uri.host == "appassets.androidplatform.net" || uri.scheme == "file") {
                    return false
                }
                // Handle external links (e.g. github, downloads) in external browser
                return try {
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(intent)
                    true
                } catch (e: Exception) {
                    Log.e("MainActivity", "Error launching external browser for: $uri", e)
                    false
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceErrorCompat
            ) {
                super.onReceivedError(view, request, error)
                // If main frame failed to resolve, gracefully recover by loading local bundle
                if (request.isForMainFrame) {
                    Log.w("MainActivity", "Main frame navigation failed, recovering with local SPA entry")
                    view.post {
                        view.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
                    }
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                Log.w("MainActivity", "Legacy navigation error ($errorCode: $description), recovering with local SPA entry")
                view.post {
                    view.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                nativeBridge.injectShim()
            }
        }

        // Expose NativeBridge to window.CropAssistantAndroid
        webView.addJavascriptInterface(nativeBridge, "CropAssistantAndroid")

        // Load the local offline bundle
        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val callback = filePathCallback
            filePathCallback = null

            if (callback != null) {
                if (resultCode == Activity.RESULT_OK) {
                    val resultUri: Uri? = if (data == null || data.data == null) {
                        // Image was taken using camera
                        cameraImageUri
                    } else {
                        // Image picked from gallery
                        data.data
                    }

                    if (resultUri != null) {
                        callback.onReceiveValue(arrayOf(resultUri))
                    } else {
                        callback.onReceiveValue(null)
                    }
                } else {
                    callback.onReceiveValue(null)
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        nativeBridge.destroy()
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
