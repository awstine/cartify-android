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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("CART", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
            TextButton(onClick = cartViewModel::clearCart) { Text("Delete all", color = MaterialTheme.colorScheme.error) }
        }

        if (cartItems.isEmpty()) {
            AppEmptyState("Cart is empty", "Add products to continue.")
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
                                Text("Color: Lavender  -  Size: M", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
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
