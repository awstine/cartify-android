package com.cartify.ui.screens.cart

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.cartify.R
import com.cartify.data.model.Product
import com.cartify.ui.navigation.NavigationItem
import com.cartify.ui.screens.product.ProductViewModel

// Ensure this is in your file
data class CartItemUiModel(
    val product: Product,
    val quantity: Int
)

@Composable
fun CartScreen(
    navController: NavController,
    cartViewModel: CartViewModel,
    productViewModel: ProductViewModel
) {
    val cart by cartViewModel.cart.collectAsState()
    val products by productViewModel.products.collectAsState()


    // Map cart data to UI models
    val cartItems = remember(cart, products) {
        cart.mapNotNull { cartItem ->
            val product = products.find { it.id == cartItem.productId }
            if (product != null) {
                CartItemUiModel(product, cartItem.quantity)
            } else {
                null
            }
        }
    }

    // Calculate total price dynamically
    val totalAmount = cartItems.sumOf { it.product.price * it.quantity }

    // Scaffold is great here because it allows us to pin the checkout section to the bottom
    Scaffold(
        bottomBar = {
            CheckoutBottomBar(navController = navController, totalAmount = totalAmount)
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "My Cart",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                // Optional: Keep clear cart as a simple text button to match the clean aesthetic
                Text(
                    text = "Clear",
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.clickable { cartViewModel.clearCart() },
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Product List
            LazyColumn(
                contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(cartItems) { uiModel ->
                    CartItem(
                        item = uiModel,
                        onIncrease = { cartViewModel.increaseQuantity(uiModel.product.id) },
                        onDecrease = { cartViewModel.decreaseQuantity(uiModel.product.id) }
                    )
                    // Add a subtle divider between items, matching the image
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 16.dp),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
                }
            }
        }
    }
}

@Composable
fun CartItem(
    item: CartItemUiModel,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 1. Image
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(item.product.imageUrl) // Ensure this points to your actual image URL property
                .crossfade(true)
                .build(),
            contentDescription = item.product.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(80.dp) // Slightly larger to match the image
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
        )

        Spacer(modifier = Modifier.width(16.dp))

        // 2. Details Column
        Column(
            modifier = Modifier
                .weight(1f)
                .height(80.dp), // Match image height to push content to top/bottom
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Section: Title and Price
            Column {
                Text(
                    text = item.product.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$${item.product.price}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Bottom Section: Subtitle and Quantity Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mocking the subtitle from your image
                Text(
                    text = "Color: Default",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) // Grayed out text
                )

                // Quantity Controls
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Minus Button
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                            .clickable { onDecrease() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Remove,
                            contentDescription = "Decrease",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Text(
                        text = "${item.quantity}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    // Plus Button
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                            .clickable { onIncrease() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Increase",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CheckoutBottomBar(navController: NavController, totalAmount: Double) {

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        // Total Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Total Amount",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                fontWeight = FontWeight.Medium
            )
            Text(
                // Formatting the total to 2 decimal places
                text = "$${String.format("%.2f", totalAmount)}",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Checkout Button
        Button(
            onClick = { navController.navigate(NavigationItem.Checkout.route) },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = CircleShape, // Pill shape from the image
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFFFCC80), // Pastel Orange/Yellow
                contentColor = Color.Black
            )
        ) {
            Text(
                text = "Check out",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Continue Shopping Button
        TextButton(
            onClick = { navController.navigate(NavigationItem.Products.route) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Continue shopping",
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                fontWeight = FontWeight.Medium
            )
        }
    }
}