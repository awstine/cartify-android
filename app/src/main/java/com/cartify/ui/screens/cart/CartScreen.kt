package com.cartify.ui.screens.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.cartify.data.model.Product
import com.cartify.ui.components.AppEmptyState
import com.cartify.ui.components.AppPrimaryButton
import com.cartify.ui.components.ProductImage
import com.cartify.ui.components.QuantityStepper
import com.cartify.ui.components.SoftCard
import com.cartify.ui.navigation.NavigationItem
import com.cartify.ui.screens.product.ProductViewModel
import com.cartify.ui.theme.TextSecondary
import java.util.Locale

data class CartItemUiModel(val product: Product, val quantity: Int)

@Composable
fun CartScreen(
    navController: NavController,
    cartViewModel: CartViewModel,
    productViewModel: ProductViewModel,
    onProductClick: (Int) -> Unit = {}
) {
    val cart by cartViewModel.cart.collectAsState()
    val productState by productViewModel.uiState.collectAsState()

    val cartItems = remember(cart, productState.products) {
        cart.mapNotNull { item ->
            productState.products.find { it.id == item.productId }?.let { CartItemUiModel(it, item.quantity) }
        }
    }
    val recommendationProducts = remember(cartItems, productState.products) {
        val inCartIds = cartItems.map { it.product.id }.toSet()
        productState.products
            .asSequence()
            .filter { it.id !in inCartIds }
            .take(10)
            .toList()
    }

    val subtotal = cartItems.sumOf { it.product.price * it.quantity }
    val shipping = if (cartItems.isEmpty()) 0.0 else 6.99
    val tax = subtotal * 0.08
    val discount = 0.0
    val total = (subtotal + shipping + tax - discount).coerceAtLeast(0.0)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text("Cart", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

        if (cartItems.isEmpty()) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    AppEmptyState("Cart is empty", "Add products to continue.")
                }
                if (recommendationProducts.isNotEmpty()) {
                    item {
                        RecommendationsGrid(
                            products = recommendationProducts,
                            onProductClick = onProductClick
                        )
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(cartItems) { item ->
                    SoftCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onProductClick(item.product.id) }
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            ProductImage(
                                model = item.product.imageUrl,
                                contentDescription = item.product.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(84.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                            )
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 10.dp)
                            ) {
                                Text(item.product.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                val sizeLabel = item.product.sizes.take(3).joinToString(", ")
                                if (sizeLabel.isNotBlank()) {
                                    Text(
                                        "Sizes: $sizeLabel",
                                        color = TextSecondary,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                Text(
                                    if (item.product.stock > 0) "Stock: ${item.product.stock}" else "Out of stock",
                                    color = if (item.product.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.labelSmall
                                )
                                Text(
                                    "KSh ${"%.2f".format(item.product.price)}",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                QuantityStepper(
                                    quantity = item.quantity,
                                    onIncrease = {
                                        if (item.quantity < item.product.stock) {
                                            cartViewModel.increaseQuantity(item.product.id)
                                        }
                                    },
                                    onDecrease = { cartViewModel.decreaseQuantity(item.product.id) }
                                )
                            }
                            TextButton(onClick = { cartViewModel.removeItem(item.product.id) }) {
                                Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }

                if (recommendationProducts.isNotEmpty()) {
                    item {
                        RecommendationsGrid(
                            products = recommendationProducts,
                            onProductClick = onProductClick
                        )
                    }
                }
            }
            AppPrimaryButton(
                text = "Checkout",
                onClick = {
                    navController.navigate(
                        "${NavigationItem.Checkout.route}?subtotal=$subtotal&shipping=$shipping&tax=$tax&discount=$discount&total=$total"
                    )
                },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun RecommendationsGrid(
    products: List<Product>,
    onProductClick: (Int) -> Unit
) {
    Text(
        "More products",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 6.dp, bottom = 4.dp)
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        products.chunked(2).forEach { rowProducts ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowProducts.forEach { product ->
                    SoftCard(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onProductClick(product.id) }
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ProductImage(
                                model = product.imageUrl,
                                contentDescription = product.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(96.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                            )
                    Text(
                        product.title,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        product.category.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        previewDescription(product.description),
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 2,
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
                                modifier = Modifier.size(12.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = String.format(Locale.US, "%.1f", rating),
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }
                    Text(
                        "KSh ${"%.2f".format(product.price)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                if (rowProducts.size == 1) Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

private fun previewDescription(text: String, maxWords: Int = 20): String {
    val words = text.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    if (words.size <= maxWords) return words.joinToString(" ")
    return words.take(maxWords).joinToString(" ") + "..."
}
