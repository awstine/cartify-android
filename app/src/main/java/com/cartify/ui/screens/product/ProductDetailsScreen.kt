package com.cartify.ui.screens.product

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.cartify.data.model.Product
import com.cartify.ui.components.AppPrimaryButton
import com.cartify.ui.components.CategoryPill
import com.cartify.ui.components.CircularIconButton
import com.cartify.ui.components.ProductImage
import com.cartify.ui.components.SoftCard
import com.cartify.ui.theme.AppRadius
import com.cartify.ui.theme.AppSpacing
import com.cartify.ui.theme.TextSecondary
import kotlinx.coroutines.launch

@Composable
fun ProductDetailsScreen(
    product: Product?,
    relatedProducts: List<Product>,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit,
    cartItemCount: Int,
    onOpenCart: () -> Unit,
    onAddToCart: (Product) -> Unit,
    onOrderNow: (Product) -> Unit,
    onSubmitReview: (Product, Int) -> Unit,
    onRelatedProductClick: (Int) -> Unit
) {
    if (product == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Product not found", style = MaterialTheme.typography.titleLarge)
        }
        return
    }

    var selectedColor by remember { mutableStateOf(0) }
    var selectedSize by remember { mutableStateOf("M") }
    var selectedReviewStars by remember { mutableStateOf(5) }
    var selectedImageIndex by remember { mutableStateOf(0) }
    val galleryImages = remember(product.imageUrl, product.imageUrls) {
        (product.imageUrls + listOf(product.imageUrl))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
            .ifEmpty { listOf(product.imageUrl) }
    }
    val galleryState = rememberLazyListState()
    val galleryScope = rememberCoroutineScope()
    val inStock = product.stock > 0

    LaunchedEffect(galleryState.firstVisibleItemIndex) {
        selectedImageIndex = galleryState.firstVisibleItemIndex.coerceIn(0, galleryImages.lastIndex)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(AppSpacing.lg),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 124.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            CircularIconButton(
                onClick = onBack,
                icon = { androidx.compose.material3.Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
            )
            CircularIconButton(
                onClick = onToggleFavorite,
                icon = {
                    androidx.compose.material3.Icon(
                        if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Wishlist",
                        tint = if (isFavorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            )
        }
        }

        item {
            SoftCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    LazyRow(
                        state = galleryState,
                        contentPadding = PaddingValues(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        itemsIndexed(galleryImages) { index, imageUrl ->
                        ProductImage(
                            model = imageUrl,
                            contentDescription = "${product.title} image ${index + 1}",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(300.dp)
                                .clip(RoundedCornerShape(AppRadius.lg))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                        )
                    }
                }
                    LazyRow(
                        modifier = Modifier.padding(horizontal = 14.dp).padding(bottom = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        itemsIndexed(galleryImages) { index, imageUrl ->
                            ProductImage(
                                model = imageUrl,
                                contentDescription = "Thumbnail ${index + 1}",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(62.dp)
                                    .border(
                                        width = if (selectedImageIndex == index) 2.dp else 1.dp,
                                        color = if (selectedImageIndex == index) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
                                        },
                                        shape = RoundedCornerShape(10.dp)
                                    )
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                                    .clickable {
                                        selectedImageIndex = index
                                        galleryScope.launch {
                                            galleryState.animateScrollToItem(index)
                                        }
                                    }
                            )
                        }
                    }
                }
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(product.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("KSh ${"%.2f".format(product.price)}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                Text(
                    text = if (inStock) "Stock: ${product.stock}" else "Out of stock",
                    color = if (inStock) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )

                val rating = product.rating?.rate ?: 0.0
                val ratingCount = product.rating?.count ?: 0
                val filledStars = rating.toInt().coerceIn(0, 5)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    repeat(5) { index ->
                        androidx.compose.material3.Icon(
                            imageVector = if (index < filledStars) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text("${String.format("%.1f", rating)} ($ratingCount reviews)", color = TextSecondary)
                }
                Text("Rate this product", fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(5) { index ->
                        val star = index + 1
                        androidx.compose.material3.Icon(
                            imageVector = if (star <= selectedReviewStars) Icons.Default.Star else Icons.Default.StarBorder,
                            contentDescription = "Rate $star stars",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .size(22.dp)
                                .clickable { selectedReviewStars = star }
                        )
                    }
                    Text("$selectedReviewStars/5", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                }
                AppPrimaryButton(
                    text = "Submit review",
                    onClick = { onSubmitReview(product, selectedReviewStars) },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Color", fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(Color(0xFF4D5BCE), Color(0xFF161616), Color(0xFFFFFFFF)).forEachIndexed { index, swatch ->
                        androidx.compose.foundation.layout.Box(
                            modifier = Modifier
                                .size(if (selectedColor == index) 32.dp else 28.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .background(
                                    if (selectedColor == index) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color.Transparent,
                                    CircleShape
                                )
                                .padding(2.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .clickable { selectedColor = index }
                        )
                    }
                }

                Text("Size", fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("S", "M", "L", "XL").forEach { size ->
                        CategoryPill(text = size, selected = selectedSize == size, onClick = { selectedSize = size })
                    }
                }

                Text(product.description, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)

            }
        }

        if (relatedProducts.isNotEmpty()) {
            item {
                Text(
                    text = "Related Products",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(relatedProducts, key = { it.id }) { related ->
                        SoftCard(
                            modifier = Modifier
                                .width(170.dp)
                                .clickable { onRelatedProductClick(related.id) }
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                ProductImage(
                                    model = related.imageUrl,
                                    contentDescription = related.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(110.dp)
                                        .clip(RoundedCornerShape(AppRadius.md))
                                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                                )
                                Text(
                                    related.title,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    if (related.stock > 0) "Stock: ${related.stock}" else "Out of stock",
                                    color = if (related.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.labelSmall
                                )
                                Text(
                                    "KSh ${"%.2f".format(related.price)}",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    Row(
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(50.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f))
                .clickable(onClick = onOpenCart),
            contentAlignment = Alignment.Center
        ) {
            if (cartItemCount > 0) {
                BadgedBox(badge = { Badge { Text(cartItemCount.toString()) } }) {
                    Icon(
                        imageVector = Icons.Default.ShoppingCart,
                        contentDescription = "Open cart",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            } else {
                Icon(
                    imageVector = Icons.Default.ShoppingCart,
                    contentDescription = "Open cart",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }
        AppPrimaryButton(
            text = if (inStock) "Add to cart" else "Out of stock",
            onClick = { onAddToCart(product) },
            modifier = Modifier.weight(1f),
            enabled = inStock
        )
        AppPrimaryButton(
            text = "Order now",
            onClick = { onOrderNow(product) },
            modifier = Modifier.weight(1f),
            enabled = inStock
        )
    }
    }
}
