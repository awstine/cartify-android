package com.cartify.ui.screens.product

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.cartify.data.model.Product
import com.cartify.ui.components.AppBottomSheet
import com.cartify.ui.components.AppEmptyState
import com.cartify.ui.components.AppErrorState
import com.cartify.ui.components.AppPrimaryButton
import com.cartify.ui.components.AppTextInput
import com.cartify.ui.components.CategoryPill
import com.cartify.ui.components.ProductCardSkeleton
import com.cartify.ui.components.SoftCard
import com.cartify.ui.theme.AppRadius
import com.cartify.ui.theme.AppSpacing
import com.cartify.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Locale

@Composable
fun ProductScreen(
    viewModel: ProductViewModel,
    onProductClick: (Int) -> Unit = {},
    onCartClick: () -> Unit = {},
    onAddToCartAttempt: (Product) -> Boolean = { false },
    onSignInRequested: () -> Unit = {},
    onCreateAccountRequested: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var showSearchSheet by remember { mutableStateOf(false) }
    var showGuestSheet by remember { mutableStateOf(false) }
    val homeCategories = listOf("All", "Men", "Women", "Kids", "New", "Sale")
    val heroProducts = uiState.products.take(8)
    val heroListState = rememberLazyListState()

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
        when {
            uiState.isLoading -> LoadingState()
            uiState.error != null -> {
                AppErrorState(
                    message = uiState.error ?: "Unable to load products",
                    onRetry = viewModel::retryLoad
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(bottom = 90.dp)
                ) {
                    if (uiState.products.isNotEmpty()) {
                        item {
                            LazyRow(
                                state = heroListState,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 6.dp),
                                contentPadding = PaddingValues(horizontal = AppSpacing.lg),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
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
                            contentPadding = PaddingValues(horizontal = AppSpacing.lg),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(homeCategories) { label ->
                                CategoryPill(
                                    text = label,
                                    selected = uiState.selectedCategory.equals(label, true),
                                    onClick = {
                                        val mapped = when (label) {
                                            "Men" -> "mens-shirts"
                                            "Women" -> "womens-dresses"
                                            "Kids" -> "tops"
                                            "New" -> "smartphones"
                                            "Sale" -> "groceries"
                                            else -> "All"
                                        }
                                        viewModel.onCategorySelected(mapped)
                                    }
                                )
                            }
                        }
                    }

                    if (uiState.products.isEmpty()) {
                        item { AppEmptyState("No products", "Try another category or search.") }
                    } else {
                        val rows = uiState.products.chunked(2)
                        items(rows) { rowProducts ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = AppSpacing.lg),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
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
                    }
                }
            }
        }

        AppBottomSheet(visible = showSearchSheet, onDismiss = { showSearchSheet = false }) {
            Column(modifier = Modifier.padding(AppSpacing.lg)) {
                Text("Search & Sort", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
                AppTextInput(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChanged,
                    label = "Search products"
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(ProductSortOption.values().toList()) { option ->
                        CategoryPill(
                            text = option.name.replace("To", " to "),
                            selected = option == uiState.selectedSort,
                            onClick = { viewModel.onSortSelected(option) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
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
    SoftCard(
        modifier = Modifier
            .width(320.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current).data(product.imageUrl).crossfade(true).build(),
                contentDescription = product.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(128.dp)
                    .clip(RoundedCornerShape(AppRadius.md))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            )
            Spacer(modifier = Modifier.size(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(product.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    product.description,
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
            .clip(RoundedCornerShape(AppRadius.md))
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current).data(product.imageUrl).crossfade(true).build(),
                contentDescription = product.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .clip(RoundedCornerShape(AppRadius.md))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(product.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
            Text(
                categoryLabel(product.category),
                color = TextSecondary,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
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
            Text("$${product.price}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
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
