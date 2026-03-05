package com.cartify.ui.screens.more

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.cartify.data.remote.backend.BackendOrder
import com.cartify.data.remote.backend.BackendStore
import com.cartify.data.model.Product
import com.cartify.data.remote.backend.WishlistItem
import com.cartify.data.remote.backend.UserProfileResponse
import com.cartify.data.repository.BackendRepository
import com.cartify.ui.components.AppCard
import com.cartify.ui.components.AppEmptyState
import com.cartify.ui.components.AppTextInput
import com.cartify.ui.components.ProductImage
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun CategoriesScreen(
    categories: List<String>,
    categoryImages: Map<String, String> = emptyMap(),
    onCategoryClick: (String) -> Unit = {},
    storeModeLabel: String? = null,
    storeModeError: String? = null,
    onRetryStoreMode: () -> Unit = {},
    onBackToMarket: () -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    val visibleCategories = categories
        .map { it.trim() }
        .filter { it.isNotBlank() && !it.equals("all", ignoreCase = true) }
        .filter { searchQuery.isBlank() || it.contains(searchQuery, ignoreCase = true) }
        .distinctBy { it.lowercase(Locale.getDefault()) }
        .sortedBy { it.lowercase(Locale.getDefault()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        if (!storeModeLabel.isNullOrBlank()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Store: $storeModeLabel",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold
                )
                TextButton(onClick = onBackToMarket) { Text("Back to market") }
            }
            if (!storeModeError.isNullOrBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        storeModeError,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = onRetryStoreMode) { Text("Retry") }
                }
            }
        }
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = {
                Text(
                    "Search categories...",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search categories",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f),
                unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
            )
        )

        LazyVerticalGrid(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            columns = GridCells.Fixed(4),
            contentPadding = PaddingValues(top = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(visibleCategories, key = { it }) { category ->
                Card(
                    modifier = Modifier.clickable { onCategoryClick(category) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        val categoryImage = categoryImages[category.trim().lowercase(Locale.getDefault())].orEmpty()
                        if (categoryImage.isBlank()) {
                            Box(
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.GridView,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        } else {
                            ProductImage(
                                model = categoryImage,
                                contentDescription = prettyCategoryLabel(category),
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                            )
                        }
                        Text(
                            prettyCategoryLabel(category),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

private fun prettyCategoryLabel(raw: String): String {
    return raw
        .replace("-", " ")
        .split(" ")
        .filter { it.isNotBlank() }
        .joinToString(" ") { part ->
            part.lowercase(Locale.getDefault()).replaceFirstChar { ch ->
                if (ch.isLowerCase()) ch.titlecase(Locale.getDefault()) else ch.toString()
            }
        }
}

@Composable
fun ProfileScreen(
    displayName: String?,
    email: String?,
    profileImageUrl: String?,
    token: String?,
    initialNotificationsEnabled: Boolean,
    initialDarkModeEnabled: Boolean,
    onNotificationsChanged: (Boolean) -> Unit = {},
    onDarkModeChanged: (Boolean) -> Unit = {},
    onProfileUpdated: (UserProfileResponse) -> Unit = {},
    onAccountDeleted: () -> Unit = {},
    onOpenOrders: () -> Unit = {},
    onLogout: () -> Unit = {},
    isLoggedIn: Boolean = false,
    products: List<Product> = emptyList(),
    onProductClick: (Int) -> Unit = {},
    onLoginRequested: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onOpenStores: () -> Unit = {},
    storeModeLabel: String? = null,
    storeModeError: String? = null,
    onRetryStoreMode: () -> Unit = {},
    onBackToMarket: () -> Unit = {}
) {
    val profileName = displayName?.trim().orEmpty().ifBlank { "Guest User" }
    val profileEmail = email?.trim().orEmpty().ifBlank { "Browse products and add to cart" }
    val randomBaseProducts = remember(products) { products.shuffled() }
    var visibleCount by remember(products) { mutableStateOf(12) }
    val feedProducts = remember(randomBaseProducts, visibleCount) {
        randomBaseProducts.take(visibleCount.coerceAtMost(randomBaseProducts.size))
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (!storeModeLabel.isNullOrBlank()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Store: $storeModeLabel",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                    TextButton(onClick = onBackToMarket) { Text("Back to market") }
                }
                if (!storeModeError.isNullOrBlank()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            storeModeError,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = onRetryStoreMode) { Text("Retry") }
                    }
                }
            }
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            ProductImage(
                                model = profileImageUrl?.trim().orEmpty(),
                                contentDescription = "Profile image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
                            )
                            Column {
                                Text(profileName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    profileEmail,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = { if (isLoggedIn) onLogout() else onLoginRequested() }) {
                                Text(if (isLoggedIn) "Logout" else "Login")
                            }
                            Icon(
                                imageVector = Icons.Default.GridView,
                                contentDescription = "Settings",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable(onClick = onOpenSettings)
                                    .padding(6.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        QuickProfileItem("Wishlist", onOpenWishlist)
                        QuickProfileItem("Followed")
                        QuickProfileItem("Stores", onOpenStores)
                        QuickProfileItem("Recent")
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("My Orders", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        OrderShortcutItem("Unpaid", onOpenOrders)
                        OrderShortcutItem("Paid", onOpenOrders)
                        OrderShortcutItem("To ship", onOpenOrders)
                        OrderShortcutItem("Return", onOpenOrders)
                    }
                }
            }
        }

        item {
            Text(
                "Products For You",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }

        if (feedProducts.isEmpty()) {
            item { AppEmptyState("No products", "Products will appear here when available.") }
        } else {
            val rows = feedProducts.chunked(2)
            items(rows.size) { rowIndex ->
                val rowProducts = rows[rowIndex]
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    rowProducts.forEach { product ->
                        ProfileProductCard(
                            product = product,
                            modifier = Modifier.weight(1f),
                            onClick = { onProductClick(product.id) }
                        )
                    }
                    if (rowProducts.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }
            if (visibleCount < randomBaseProducts.size) {
                item(key = "profile-load-more") {
                    LaunchedEffect(visibleCount, randomBaseProducts.size) {
                        visibleCount = (visibleCount + 10).coerceAtMost(randomBaseProducts.size)
                    }
                    Text(
                        "Loading more products...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickProfileItem(title: String, onClick: (() -> Unit)? = null) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
        }
        Text(title, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoresScreen(
    stores: List<BackendStore>,
    selectedStoreSlug: String? = null,
    isLoading: Boolean = false,
    isSelectingStore: Boolean = false,
    errorMessage: String? = null,
    onRetry: () -> Unit = {},
    onRefresh: () -> Unit = {},
    onStoreClick: (BackendStore) -> Unit = {},
    onBackToMarket: () -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    val activeStores = stores.filter { it.isActive }
    val visibleStores = activeStores.filter { store ->
        searchQuery.isBlank() ||
            store.name.contains(searchQuery, ignoreCase = true) ||
            store.slug.contains(searchQuery, ignoreCase = true)
    }
    val pullToRefreshState = rememberPullToRefreshState()
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PullToRefreshBox(
            isRefreshing = isLoading && !isSelectingStore,
            onRefresh = onRefresh,
            state = pullToRefreshState,
            modifier = Modifier.fillMaxSize()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Stores", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    if (!selectedStoreSlug.isNullOrBlank()) {
                        TextButton(onClick = onBackToMarket) { Text("Back to market") }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("Search stores...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search stores") },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        focusedBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f),
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))
                if (isLoading && visibleStores.isEmpty() && !isSelectingStore) {
                    Text("Loading stores...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else if (!errorMessage.isNullOrBlank()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(errorMessage, color = MaterialTheme.colorScheme.error)
                        TextButton(onClick = onRetry) { Text("Retry") }
                    }
                } else if (visibleStores.isEmpty()) {
                    AppEmptyState("No stores", "Stores will appear here.")
                } else {
                    LazyVerticalGrid(
                        modifier = Modifier.fillMaxSize(),
                        columns = GridCells.Fixed(4),
                        horizontalArrangement = Arrangement.spacedBy(1.dp),
                        verticalArrangement = Arrangement.spacedBy(1.dp),
                        contentPadding = PaddingValues(bottom = 1.dp)
                    ) {
                        items(visibleStores, key = { it.id }) { store ->
                            val selected = selectedStoreSlug == store.slug
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(enabled = !isSelectingStore) { onStoreClick(store) }
                                    .padding(1.dp),
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = Color.White
                                )
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp, horizontal = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    val hasLogo = store.logoUrl?.trim().orEmpty().isNotBlank()
                                    if (hasLogo) {
                                        ProductImage(
                                            model = store.logoUrl.orEmpty(),
                                            contentDescription = store.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(62.dp)
                                                .clip(RoundedCornerShape(12.dp))
                                        )
                                    } else {
                                        Box(
                                            modifier = Modifier
                                                .size(62.dp)
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(storeInitialsColor(store.slug)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = storeInitials(store.name),
                                                style = MaterialTheme.typography.titleSmall,
                                                color = Color.White,
                                                fontWeight = FontWeight.ExtraBold
                                            )
                                        }
                                    }
                                    Text(
                                        store.name,
                                        style = MaterialTheme.typography.labelSmall,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        if (isSelectingStore) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.82f)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CircularProgressIndicator()
                    Text(
                        "Opening store...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

private fun storeInitials(name: String): String {
    val compact = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    if (compact.isEmpty()) return "ST"
    val first = compact.first().firstOrNull()?.uppercaseChar() ?: 'S'
    val second = if (compact.size > 1) {
        compact[1].firstOrNull()?.uppercaseChar() ?: 'T'
    } else {
        compact.first().drop(1).firstOrNull()?.uppercaseChar() ?: 'T'
    }
    return "$first$second"
}

private fun storeInitialsColor(key: String): Color {
    val palette = listOf(
        Color(0xFFEF6C00),
        Color(0xFF1E88E5),
        Color(0xFF43A047),
        Color(0xFFE53935),
        Color(0xFF8E24AA),
        Color(0xFF00897B),
        Color(0xFF3949AB),
        Color(0xFF6D4C41)
    )
    val index = (key.hashCode().let { if (it == Int.MIN_VALUE) 0 else kotlin.math.abs(it) }) % palette.size
    return palette[index]
}

@Composable
private fun OrderShortcutItem(title: String, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ReceiptLong,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
        }
        Text(title, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun ProfileProductCard(
    product: Product,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            ProductImage(
                model = product.imageUrl,
                contentDescription = product.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(112.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            )
            Text(
                product.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "KSh ${"%.2f".format(product.price)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            Text(
                product.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            val rating = product.rating?.rate ?: 0.0
            val filledStars = rating.toInt().coerceIn(0, 5)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                repeat(5) { index ->
                    Icon(
                        imageVector = if (index < filledStars) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(13.dp)
                    )
                }
                Text(
                    String.format(Locale.US, "%.1f", rating),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp)
                )
            }
            Text(
                if (product.stock > 0) "Stock: ${product.stock}" else "Out of stock",
                style = MaterialTheme.typography.labelSmall,
                color = if (product.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
        }
    }
}
@Composable
private fun ProfileSection(
    visible: Boolean,
    delayMillis: Int,
    content: @Composable () -> Unit
) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(animationSpec = tween(durationMillis = 320, delayMillis = delayMillis)) +
            slideInVertically(
                animationSpec = tween(durationMillis = 320, delayMillis = delayMillis),
                initialOffsetY = { it / 5 }
            )
    ) {
        content()
    }
}

@Composable
private fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    AppCard(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f),
                    shape = RoundedCornerShape(14.dp)
                )
        ) {
            content()
        }
    }
}

@Composable
private fun ProfileMetricChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
            .padding(vertical = 10.dp, horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ProfileActionButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    danger: Boolean = false
) {
    val contentColor = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
    val bgColor = if (danger) {
        MaterialTheme.colorScheme.error.copy(alpha = 0.10f)
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
    }
    val borderColor = if (danger) {
        MaterialTheme.colorScheme.error.copy(alpha = 0.35f)
    } else {
        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 11.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = text, tint = contentColor, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.size(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = contentColor
        )
    }
}

@Composable
private fun ProfileItemRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .let { base -> if (onClick != null) base.clickable { onClick() } else base }
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f),
                shape = RoundedCornerShape(14.dp)
            )
            .padding(horizontal = 10.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = title, tint = MaterialTheme.colorScheme.primary)
        }
        Column(modifier = Modifier.weight(1f).padding(start = 10.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(
    token: String?,
    activeStoreSlug: String? = null,
    onProductClick: (String) -> Unit = {},
    onWishlistChanged: (Set<String>) -> Unit = {}
) {
    val repository = remember { BackendRepository() }
    var refreshTick by remember { mutableStateOf(0) }
    var state by remember(token) { mutableStateOf(WishlistUiState(isLoading = true)) }

    LaunchedEffect(token, refreshTick) {
        val authToken = token?.trim()
        if (authToken.isNullOrEmpty()) {
            state = WishlistUiState(error = "Missing session token")
            return@LaunchedEffect
        }

        state = runCatching { repository.getWishlist(authToken) }
            .fold(
                onSuccess = { wishlist ->
                    val scopedItems = if (activeStoreSlug.isNullOrBlank()) {
                        wishlist.items
                    } else {
                        wishlist.items.filter { item ->
                            item.product?.storeSlug?.equals(activeStoreSlug, ignoreCase = true) == true
                        }
                    }
                    val ids = wishlist.items.map { it.productId }.toSet()
                    onWishlistChanged(ids)
                    WishlistUiState(items = scopedItems)
                },
                onFailure = { WishlistUiState(error = it.message ?: "Unable to load wishlist") }
            )
    }

    val scope = rememberCoroutineScope()
    val authToken = token?.trim().orEmpty()
    var removingProductId by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val pullToRefreshState = rememberPullToRefreshState()

    PullToRefreshBox(
        isRefreshing = state.isLoading,
        onRefresh = { refreshTick += 1 },
        state = pullToRefreshState,
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Column {
            Text("Wishlist", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(
                "Saved items to buy later",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            when {
                state.isLoading -> {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text("Loading wishlist...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                state.error != null -> {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(state.error ?: "Unable to load wishlist", color = MaterialTheme.colorScheme.error)
                }

                state.items.isEmpty() -> {
                    Spacer(modifier = Modifier.height(12.dp))
                    AppEmptyState("Wishlist is empty", "Save products and they will show here.")
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(state.items, key = { it.productId }) { item ->
                            val product = item.product
                            AppCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        onProductClick(item.productId)
                                    }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    ProductImage(
                                        model = product?.imageUrl.orEmpty(),
                                        contentDescription = product?.title ?: "Wishlist product",
                                        modifier = Modifier
                                            .size(72.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)),
                                        contentScale = ContentScale.Crop
                                    )
                                    Column(
                                        modifier = Modifier
                                            .weight(1f)
                                            .padding(start = 10.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            product?.title ?: "Product unavailable",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            product?.category?.replaceFirstChar { it.uppercase() } ?: "Unknown category",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Text(
                                            "KSh ${"%.2f".format(product?.price ?: 0.0)}",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.error.copy(alpha = 0.12f))
                                            .clickable(enabled = removingProductId != item.productId) {
                                                if (authToken.isBlank()) return@clickable
                                                removingProductId = item.productId
                                                actionError = null
                                                scope.launch {
                                                    runCatching { repository.removeWishlistItem(authToken, item.productId) }
                                                        .onSuccess {
                                                            val updatedIds =
                                                                state.items.filterNot { it.productId == item.productId }.map { it.productId }.toSet()
                                                            onWishlistChanged(updatedIds)
                                                            state = WishlistUiState(
                                                                items = state.items.filterNot { it.productId == item.productId }
                                                            )
                                                        }
                                                        .onFailure {
                                                            actionError = it.message ?: "Unable to remove item"
                                                        }
                                                    removingProductId = null
                                                }
                                            }
                                            .padding(8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.DeleteOutline,
                                            contentDescription = "Remove from wishlist",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!actionError.isNullOrBlank()) {
                Text(
                    actionError ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(token: String?) {
    val repository = remember { BackendRepository() }
    var refreshTick by remember { mutableStateOf(0) }
    val state by produceState<OrdersUiState>(initialValue = OrdersUiState(isLoading = true), token, refreshTick) {
        val authToken = token?.trim()
        if (authToken.isNullOrEmpty()) {
            value = OrdersUiState(error = "Missing session token")
            return@produceState
        }

        value = runCatching { repository.getOrders(authToken) }
            .fold(
                onSuccess = { orders -> OrdersUiState(orders = orders) },
                onFailure = { OrdersUiState(error = it.message ?: "Unable to load orders") }
            )
    }

    when {
        state.isLoading -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf("Loading orders..."),
            refreshing = state.isLoading,
            onRefresh = { refreshTick += 1 }
        )

        state.error != null -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf(state.error ?: "Unable to load orders"),
            refreshing = state.isLoading,
            onRefresh = { refreshTick += 1 }
        )

        state.orders.isEmpty() -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf("No orders yet"),
            refreshing = state.isLoading,
            onRefresh = { refreshTick += 1 }
        )

        else -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(16.dp)
            ) {
                val pullToRefreshState = rememberPullToRefreshState()
                PullToRefreshBox(
                    isRefreshing = state.isLoading,
                    onRefresh = { refreshTick += 1 },
                    state = pullToRefreshState,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Column {
                        Text("Orders", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        Text(
                            "Track your order progress in real time",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(state.orders, key = { it.id }) { order ->
                                val shortId = if (order.id.length > 8) order.id.takeLast(8) else order.id
                                val date = order.createdAt.take(10)
                                val itemCount = order.items.sumOf { it.quantity }
                                val progressIndex = orderProgressIndex(order.status)
                                val statusLabel = prettyOrderStatus(order.status)
                                val statusColor = when {
                                    order.status.equals("cancelled", ignoreCase = true) ->
                                        MaterialTheme.colorScheme.error
                                    order.status.equals("delivered", ignoreCase = true) ->
                                        MaterialTheme.colorScheme.primary
                                    else -> MaterialTheme.colorScheme.tertiary
                                }
                                AppCard(modifier = Modifier.fillMaxWidth()) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                "Order #$shortId",
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                statusLabel,
                                                color = statusColor,
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }

                                        Text(
                                            "$itemCount item(s) - KSh ${"%.2f".format(order.total)} - $date",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )

                                        val steps = listOf("Placed", "Processing", "Shipped", "Delivered")
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            steps.forEachIndexed { index, step ->
                                                Column(
                                                    modifier = Modifier.weight(1f),
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(10.dp)
                                                            .clip(CircleShape)
                                                            .background(
                                                                when {
                                                                    progressIndex >= index ->
                                                                        MaterialTheme.colorScheme.primary
                                                                    order.status.equals("cancelled", ignoreCase = true) ->
                                                                        MaterialTheme.colorScheme.error.copy(alpha = 0.45f)
                                                                    else ->
                                                                        MaterialTheme.colorScheme.surfaceVariant
                                                                }
                                                            )
                                                    )
                                                    Text(
                                                        step,
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = if (progressIndex >= index) {
                                                            MaterialTheme.colorScheme.primary
                                                        } else {
                                                            MaterialTheme.colorScheme.onSurfaceVariant
                                                        }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OffersScreen() = SimpleListPage(
    title = "Offers",
    subtitle = "Latest campaigns and discounts",
    rows = listOf("Up to 40% off electronics", "Weekend buy-1-get-1 fashion", "Free shipping over KSh 50")
)

@Composable
fun SettingsScreen() = SimpleListPage(
    title = "Settings",
    subtitle = "General app preferences",
    rows = listOf("Theme and display", "Language and region", "Privacy controls", "Security")
)

@Composable
fun HelpScreen() = SimpleListPage(
    title = "Help",
    subtitle = "Support and policy information",
    rows = listOf("Contact support", "Returns and refunds", "Shipping policy", "FAQ")
)

@Composable
fun AboutScreen() = SimpleListPage(
    title = "About",
    subtitle = "App information",
    rows = listOf("Cartify Android app", "Version 1.0", "Built with Jetpack Compose")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SimpleListPage(
    title: String,
    subtitle: String,
    rows: List<String>,
    refreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        val content: @Composable () -> Unit = {
            Column {
                Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(rows) { row ->
                        AppCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(row, modifier = Modifier.weight(1f))
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        }

        if (onRefresh != null) {
            val pullToRefreshState = rememberPullToRefreshState()
            PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = onRefresh,
                state = pullToRefreshState,
                modifier = Modifier.fillMaxSize()
            ) {
                content()
            }
        } else {
            content()
        }
    }
}

private data class OrdersUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val orders: List<BackendOrder> = emptyList()
)

private fun orderProgressIndex(status: String): Int {
    return when (status.trim().lowercase(Locale.getDefault())) {
        "placed", "pending", "new" -> 0
        "processing", "paid", "confirmed" -> 1
        "shipped", "in_transit", "in transit", "dispatch", "dispatched" -> 2
        "delivered", "completed" -> 3
        "cancelled", "canceled", "failed" -> -1
        else -> 0
    }
}

private fun prettyOrderStatus(status: String): String {
    val normalized = status.trim().ifBlank { "pending" }
    return normalized
        .replace("_", " ")
        .split(" ")
        .filter { it.isNotBlank() }
        .joinToString(" ") { token ->
            token.lowercase(Locale.getDefault()).replaceFirstChar { ch ->
                if (ch.isLowerCase()) ch.titlecase(Locale.getDefault()) else ch.toString()
            }
        }
}

private data class WishlistUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val items: List<WishlistItem> = emptyList()
)

private data class ProfileUiState(
    val name: String = "Cartify User",
    val email: String = "Signed in user",
    val profileImageUrl: String = "",
    val memberSince: String = "N/A",
    val ordersCount: Int = 0,
    val wishlistCount: Int = 0,
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null
) {
    val initial: String
        get() = name.firstOrNull()?.uppercase() ?: "C"
}

@Composable
private fun ProfileStatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    AppCard(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
                .padding(vertical = 12.dp, horizontal = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            Text(
                title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
