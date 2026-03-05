package com.cartify.ui.components

import android.content.Context
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest

@Composable
fun ProductImage(
    model: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
) {
    val value = remember(model) { model.trim() }
    val optimizedValue = remember(value) { optimizedImageUrl(value) }
    val dataUrlBitmap = remember(value) { decodeDataUrlBitmap(value) }

    if (dataUrlBitmap != null) {
        Image(
            bitmap = dataUrlBitmap.asImageBitmap(),
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = modifier
        )
        return
    }

    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(optimizedValue)
            .crossfade(true)
            .build(),
        contentDescription = contentDescription,
        contentScale = contentScale,
        modifier = modifier
    )
}

private fun decodeDataUrlBitmap(value: String) = runCatching {
    if (!value.startsWith("data:image/", ignoreCase = true)) return@runCatching null
    val commaIndex = value.indexOf(',')
    if (commaIndex <= 0 || commaIndex >= value.lastIndex) return@runCatching null

    val payload = value.substring(commaIndex + 1).replace("\\s".toRegex(), "")
    val bytes = Base64.decode(payload, Base64.DEFAULT)
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
}.getOrNull()

fun prefetchImageUrls(context: Context, urls: List<String>) {
    urls.asSequence()
        .map { it.trim() }
        .filter { it.isNotBlank() && !it.startsWith("data:image/", ignoreCase = true) }
        .map { optimizedImageUrl(it) }
        .distinct()
        .take(20)
        .forEach { url ->
            val request = ImageRequest.Builder(context)
                .data(url)
                .build()
            context.imageLoader.enqueue(request)
        }
}

private fun optimizedImageUrl(raw: String): String {
    if (raw.startsWith("data:image/", ignoreCase = true)) return raw
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) return raw
    val hasQuery = raw.contains('?')
    return when {
        raw.contains("cloudinary.com", ignoreCase = true) -> {
            raw.replace("/upload/", "/upload/f_auto,q_auto/", ignoreCase = true)
        }
        raw.contains("imgix.net", ignoreCase = true) -> {
            if (hasQuery) "$raw&auto=format,compress" else "$raw?auto=format,compress"
        }
        else -> {
            if (hasQuery) "$raw&format=webp" else "$raw?format=webp"
        }
    }
}
