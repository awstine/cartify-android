package com.cartify.ui.screens.checkout

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cartify.data.repository.CommerceExperienceRepository
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
    val context = LocalContext.current
    val experienceRepository = remember { CommerceExperienceRepository(context) }
    val addresses by experienceRepository.addresses.collectAsState()
    var selectedAddressId by remember(addresses) { mutableStateOf(addresses.firstOrNull { it.isDefault }?.id ?: addresses.firstOrNull()?.id.orEmpty()) }
    var couponCode by remember { mutableStateOf("") }
    var couponMessage by remember { mutableStateOf<String?>(null) }
    var couponDiscount by remember { mutableStateOf(discount.coerceAtLeast(0.0)) }
    var courier by remember { mutableStateOf("Standard") }
    var deliveryZone by remember { mutableStateOf("Urban") }
    val selectedAddress = addresses.firstOrNull { it.id == selectedAddressId }
    val effectiveZone = when {
        selectedAddress?.city?.contains("Nairobi", ignoreCase = true) == true -> "Urban"
        selectedAddress?.city?.isNotBlank() == true -> "Upcountry"
        else -> deliveryZone
    }
    val dynamicShipping = calculateDynamicShipping(baseShipping = shipping, courier = courier, zone = effectiveZone)
    val deliveryEta = estimateCheckoutEta(courier = courier, zone = effectiveZone)
    val effectiveDiscount = couponDiscount.coerceAtLeast(discount.coerceAtLeast(0.0))
    val effectiveTotal = (subtotal + dynamicShipping + tax - effectiveDiscount).coerceAtLeast(0.0)

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
                if (addresses.isNotEmpty()) {
                    Text("Delivery address", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    addresses.take(3).forEach { address ->
                        val selected = selectedAddressId == address.id
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(
                                    if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                                    else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.20f)
                                )
                                .clickable { selectedAddressId = address.id }
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(address.label, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${address.recipientName}, ${address.line1}, ${address.city}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (selected) {
                                Text("Selected", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
                Text("Delivery", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { courier = "Standard" }) { Text(if (courier == "Standard") "Standard*" else "Standard") }
                    TextButton(onClick = { courier = "Express" }) { Text(if (courier == "Express") "Express*" else "Express") }
                    TextButton(onClick = { courier = "Pickup" }) { Text(if (courier == "Pickup") "Pickup*" else "Pickup") }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { deliveryZone = "Urban" }) { Text(if (deliveryZone == "Urban") "Urban*" else "Urban") }
                    TextButton(onClick = { deliveryZone = "Upcountry" }) { Text(if (deliveryZone == "Upcountry") "Upcountry*" else "Upcountry") }
                }
                Text(
                    "ETA: $deliveryEta",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text("Promo code", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = couponCode,
                        onValueChange = { couponCode = it },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("SAVE10 / WELCOME5 / FREESHIP") },
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surface
                        )
                    )
                    TextButton(
                        onClick = {
                            val result = experienceRepository.applyCoupon(couponCode, subtotal, shipping)
                            couponMessage = result.message
                            if (result.isValid) {
                                couponDiscount = discount + result.discountAmount
                            }
                        }
                    ) { Text("Apply") }
                }
                if (!couponMessage.isNullOrBlank()) {
                    Text(
                        couponMessage ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (couponDiscount > discount) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                }
                SummaryRow("Subtotal", subtotal)
                SummaryRow("Shipping", dynamicShipping)
                SummaryRow("Tax", tax)
                SummaryRow("Discount", -effectiveDiscount)
                SummaryRow("Total", effectiveTotal, strong = true)
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

internal fun calculateDynamicShipping(baseShipping: Double, courier: String, zone: String): Double {
    val courierFee = when (courier.lowercase()) {
        "express" -> 4.0
        "pickup" -> -baseShipping.coerceAtMost(3.0)
        else -> 0.0
    }
    val zoneFee = when (zone.lowercase()) {
        "upcountry" -> 3.5
        else -> 0.0
    }
    return (baseShipping + courierFee + zoneFee).coerceAtLeast(0.0)
}

internal fun estimateCheckoutEta(courier: String, zone: String): String {
    val days = when {
        courier.equals("pickup", true) -> 0
        courier.equals("express", true) && zone.equals("urban", true) -> 1
        courier.equals("express", true) -> 2
        zone.equals("urban", true) -> 2
        else -> 4
    }
    return if (days == 0) "Ready today for pickup" else "$days-${
        (days + 1)
    } days"
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
            text = "KSh ${String.format("%.2f", amount)}",
            fontWeight = if (strong) FontWeight.ExtraBold else FontWeight.SemiBold,
            color = if (strong) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
        )
    }
}
