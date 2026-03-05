package com.cartify.ui.screens.product

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.cartify.data.model.Product
import com.cartify.ui.components.AppBottomSheet
import com.cartify.ui.components.AppEmptyState
import com.cartify.ui.components.AppErrorState
import com.cartify.ui.components.AppPrimaryButton
import com.cartify.ui.components.CategoryPill
import com.cartify.ui.components.ProductImage
import com.cartify.ui.components.ProductCardSkeleton
import com.cartify.ui.components.SoftCard
import com.cartify.ui.theme.AppRadius
import com.cartify.ui.theme.AppSpacing
import com.cartify.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Locale
import kotlin.math.min

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ProductScreen(
    viewModel: ProductViewModel,
    onProductClick: (Int) -> Unit = {},
    onCartClick: () -> Unit = {},
    onAddToCartAttempt: (Product) -> Boolean = { false },
    onSignInRequested: () -> Unit = {},
    onCreateAccountRequested: () -> Unit = {},
    productsOverride: List<Product>? = null,
    productsOverrideLoading: Boolean = false,
    productsOverrideError: String? = null,
    onRetryProductsOverride: (() -> Unit)? = null,
    storeModeLabel: String? = null,
    onBackToMarket: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var showGuestSheet by remember { mutableStateOf(false) }
    val hasOverride = productsOverride != null
    val baseProducts = productsOverride ?: uiState.products
    val scopedProducts = remember(baseProducts, uiState.searchQuery, uiState.selectedCategory, uiState.selectedSort, hasOverride) {
        if (!hasOverride) {
            baseProducts
        } else {
            val filtered = baseProducts
                .filter { uiState.selectedCategory == "All" || it.category.equals(uiState.selectedCategory, true) }
                .filter {
                    uiState.searchQuery.isBlank() ||
                        it.title.contains(uiState.searchQuery, ignoreCase = true) ||
                        it.description.contains(uiState.searchQuery, ignoreCase = true)
                }
            when (uiState.selectedSort) {
                ProductSortOption.Popularity -> filtered.sortedByDescending { it.rating?.count ?: 0 }
                ProductSortOption.Newest -> filtered.sortedByDescending { it.id }
                ProductSortOption.PriceLowToHigh -> filtered.sortedBy { it.price }
                ProductSortOption.PriceHighToLow -> filtered.sortedByDescending { it.price }
            }
        }
    }
    val homeCategories = remember(scopedProducts) {
        val base = scopedProducts
            .map { it.category.trim() }
            .filter { it.isNotBlank() }
            .distinctBy { it.lowercase(Locale.getDefault()) }
            .sortedBy { it.lowercase(Locale.getDefault()) }
        listOf("All") + base
    }
    val heroProducts = scopedProducts.take(8)
    val heroListState = rememberLazyListState()
    val productFeedListState = rememberLazyListState()
    var visibleCount by remember(
        uiState.searchQuery,
        uiState.selectedCategory,
        uiState.selectedSort,
        scopedProducts.size
    ) { mutableStateOf(12) }
    val visibleProducts = remember(scopedProducts, visibleCount) {
        scopedProducts.take(visibleCount.coerceAtLeast(1))
    }
    val pullToRefreshState = rememberPullToRefreshState()

    LaunchedEffect(heroProducts.size) {
        if (heroProducts.size <= 1) return@LaunchedEffect
        while (isActive) {
            delay(4000)
            val atLast = heroListState.firstVisibleItemIndex >= heroProducts.lastIndex
            if (atLast) {
                heroListState.scrollToItem(0)
            } else {
                heroListState.animateScrollToItem(heroListState.firstVisibleItemIndex + 1)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.retryLoad() },
            state = pullToRefreshState,
            modifier = Modifier.fillMaxSize()
        ) {
            when {
                (if (hasOverride) productsOverrideLoading else uiState.isLoading) && scopedProducts.isEmpty() -> LoadingState()
                (if (hasOverride) !productsOverrideError.isNullOrBlank() else uiState.error != null) && scopedProducts.isEmpty() -> {
                    AppErrorState(
                        message = productsOverrideError ?: uiState.error ?: "Unable to load products",
                        onRetry = { onRetryProductsOverride?.invoke() ?: viewModel.retryLoad() }
                    )
                }
                else -> {
                    LazyColumn(
                        state = productFeedListState,
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 72.dp)
                    ) {
                        stickyHeader {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.background)
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = uiState.searchQuery,
                                    onValueChange = viewModel::onSearchQueryChanged,
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    placeholder = {
                                        Text(
                                            "Search products...",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            imageVector = Icons.Default.Search,
                                            contentDescription = "Search products",
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
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(ProductSortOption.values().toList()) { option ->
                                        CategoryPill(
                                            text = option.name.replace("To", " to "),
                                            selected = option == uiState.selectedSort,
                                            onClick = { viewModel.onSortSelected(option) }
                                        )
                                    }
                                }
                                if (!storeModeLabel.isNullOrBlank()) {
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
                                        TextButton(onClick = onBackToMarket) {
                                            Text("Back to market")
                                        }
                                    }
                                }
                            }
                        }

                        if (scopedProducts.isNotEmpty()) {
                            item {
                                LazyRow(
                                    state = heroListState,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 2.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(heroProducts, key = { it.id }) { hero ->
                                        HeroProductCard(
                                            product = hero,
                                            onProductClick = { onProductClick(hero.id) }
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            LazyRow(
                                modifier = Modifier.fillMaxWidth(),
                                contentPadding = PaddingValues(horizontal = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                items(homeCategories) { category ->
                                    CategoryPill(
                                        text = categoryLabel(category),
                                        selected = uiState.selectedCategory.equals(category, true),
                                        onClick = { viewModel.onCategorySelected(category) }
                                    )
                                }
                            }
                        }

                        if (scopedProducts.isEmpty()) {
                            item { AppEmptyState("No products", "Try another category or search.") }
                        } else {
                            val rows = visibleProducts.chunked(2)
                            items(rows) { rowProducts ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    rowProducts.forEach { product ->
                                        HomeProductCard(
                                            product = product,
                                            onClick = { onProductClick(product.id) },
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                    if (rowProducts.size == 1) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                            }

                            if (visibleCount < scopedProducts.size) {
                                item(key = "load-more-trigger") {
                                    LaunchedEffect(visibleCount, scopedProducts.size) {
                                        visibleCount = min(visibleCount + 10, scopedProducts.size)
                                    }
                                    Text(
                                        "Loading more products...",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp, vertical = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        AppBottomSheet(visible = showGuestSheet, onDismiss = { showGuestSheet = false }) {
            Column(modifier = Modifier.padding(AppSpacing.lg)) {
                Text("Sign in to continue", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Create an account or sign in to add items to your cart and checkout faster.",
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(14.dp))
                AppPrimaryButton(
                    text = "Sign in",
                    onClick = {
                        showGuestSheet = false
                        onSignInRequested()
                    },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = {
                        showGuestSheet = false
                        onCreateAccountRequested()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Create account")
                }
                TextButton(
                    onClick = { showGuestSheet = false },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Continue browsing")
                }
            }
        }
    }
}

@Composable
private fun LoadingState() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 12.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = AppSpacing.lg),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Cartify", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            }
        }
        item { ProductCardSkeleton(modifier = Modifier.padding(horizontal = AppSpacing.lg)) }
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = AppSpacing.lg),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(listOf(1, 2, 3, 4)) {
                    ProductCardSkeleton(modifier = Modifier.width(180.dp))
                }
            }
        }
    }
}

@Composable
private fun HeroProductCard(product: Product, onProductClick: () -> Unit) {
    Card(
        modifier = Modifier
            .width(304.dp),
        shape = RoundedCornerShape(1.5.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            ProductImage(
                model = product.imageUrl,
                contentDescription = product.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(128.dp)
                    .clip(RoundedCornerShape(1.5.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            )
            Spacer(modifier = Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(product.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    if (product.stock > 0) "Stock: ${product.stock}" else "Out of stock",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (product.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    previewDescription(product.description, maxWords = 20),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                TextButton(onClick = onProductClick) { Text("Show more") }
            }
        }
    }
}

@Composable
private fun HomeProductCard(
    product: Product,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    SoftCard(
        modifier = modifier
            .defaultMinSize(minHeight = 250.dp)
            .clip(RoundedCornerShape(AppRadius.md))
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            ProductImage(
                model = product.imageUrl,
                contentDescription = product.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(118.dp)
                    .clip(RoundedCornerShape(AppRadius.md))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(product.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
            Text(
                categoryLabel(product.category),
                color = TextSecondary,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                if (product.stock > 0) "Stock: ${product.stock}" else "Out of stock",
                color = if (product.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                previewDescription(product.description, maxWords = 20),
                color = TextSecondary,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.height(34.dp)
            )
            Spacer(modifier = Modifier.height(3.dp))
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
                        modifier = Modifier.size(14.dp)
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = String.format(Locale.US, "%.1f", rating),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
            Text("KSh ${"%.2f".format(product.price)}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        }
    }
}

private fun categoryLabel(raw: String): String {
    return raw
        .replace("-", " ")
        .split(" ")
        .joinToString(" ") { part ->
            part.lowercase(Locale.getDefault()).replaceFirstChar { ch ->
                if (ch.isLowerCase()) ch.titlecase(Locale.getDefault()) else ch.toString()
            }
        }
}

private fun previewDescription(text: String, maxWords: Int = 20): String {
    val words = text.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    if (words.size <= maxWords) return words.joinToString(" ")
    return words.take(maxWords).joinToString(" ") + "..."
}
