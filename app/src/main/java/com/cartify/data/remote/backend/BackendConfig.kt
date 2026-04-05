package com.cartify.data.remote.backend

import android.os.Build
import com.cartify.BuildConfig
import java.util.Locale

object BackendConfig {
    val baseUrl: String = BuildConfig.BACKEND_BASE_URL

    val candidateBaseUrls: List<String> by lazy {
        val normalizedConfigured = normalizeBaseUrl(baseUrl)
        if (!BuildConfig.DEBUG) {
            listOf(normalizedConfigured)
        } else {
            buildList {
                add(normalizedConfigured)

                val configuredPort = normalizedConfigured.substringAfter("://")
                    .substringAfter(":", "4000")
                    .substringBefore("/")

                val emulatorUrl = "http://10.0.2.2:$configuredPort/api/"
                val usbReverseUrl = "http://127.0.0.1:$configuredPort/api/"
                val localhostUrl = "http://localhost:$configuredPort/api/"

                if (isProbablyEmulator()) {
                    add(emulatorUrl)
                    add(usbReverseUrl)
                    add(localhostUrl)
                } else {
                    add(usbReverseUrl)
                    add(localhostUrl)
                    add(emulatorUrl)
                }
            }.distinct()
        }
    }

    private fun normalizeBaseUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        if (trimmed.isEmpty()) return "http://10.0.2.2:4000/api/"

        val withScheme = if ("://" in trimmed) trimmed else "http://$trimmed"
        val normalized = withScheme.replace("\\s+".toRegex(), "")
        return when {
            normalized.lowercase(Locale.ROOT).endsWith("/api/") -> normalized
            normalized.lowercase(Locale.ROOT).endsWith("/api") -> "$normalized/"
            normalized.endsWith("/") -> "${normalized}api/"
            else -> "$normalized/api/"
        }
    }

    private fun isProbablyEmulator(): Boolean {
        return Build.FINGERPRINT.startsWith("generic") ||
            Build.MODEL.contains("Emulator", ignoreCase = true) ||
            Build.MODEL.contains("Android SDK built for", ignoreCase = true) ||
            Build.MANUFACTURER.contains("Genymotion", ignoreCase = true) ||
            Build.BRAND.startsWith("generic") ||
            Build.DEVICE.startsWith("generic") ||
            Build.PRODUCT.contains("sdk", ignoreCase = true)
    }
}
