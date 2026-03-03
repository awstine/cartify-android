package com.cartify.ui.screens.checkout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cartify.ui.components.AppPrimaryButton

@Composable
fun CheckoutScreen(
    subtotal: Double,
    shipping: Double,
    tax: Double,
    discount: Double,
    total: Double,
    isPlacingOrder: Boolean,
    orderError: String?,
    onProceedCheckout: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Checkout", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Order Summary", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                SummaryRow("Subtotal", subtotal)
                SummaryRow("Shipping", shipping)
                SummaryRow("Tax", tax)
                SummaryRow("Discount", -discount)
                SummaryRow("Total", total, strong = true)
                if (!orderError.isNullOrBlank()) {
                    Text(orderError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(modifier = Modifier.height(8.dp))
                if (isPlacingOrder) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                }
                AppPrimaryButton(
                    text = if (isPlacingOrder) "Placing order..." else "Proceed to checkout",
                    onClick = onProceedCheckout,
                    enabled = !isPlacingOrder,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
fun CheckoutSuccessScreen(
    onContinueShopping: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Text("OK", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(modifier = Modifier.height(20.dp))
            Text("Thank you for your purchase.", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Your order is confirmed and will be shipped in 2-4 days.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(28.dp))
            AppPrimaryButton(
                text = "Continue shopping",
                onClick = onContinueShopping,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, amount: Double, strong: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            color = if (strong) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = if (strong) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            text = "$${String.format("%.2f", amount)}",
            fontWeight = if (strong) FontWeight.ExtraBold else FontWeight.SemiBold,
            color = if (strong) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
        )
    }
}
