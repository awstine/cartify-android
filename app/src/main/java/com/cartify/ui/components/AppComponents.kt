package com.cartify.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Badge
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.cartify.ui.theme.AppElevation
import com.cartify.ui.theme.AppRadius
import com.cartify.ui.theme.PrimaryPurple
import com.cartify.ui.theme.PrimaryViolet
import com.cartify.ui.theme.SoftCard as SoftCardColor
import com.cartify.ui.theme.TextSecondary

@Composable
fun AppPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 50.dp
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed = interaction.collectIsPressedAsState().value
    val scale = animateFloatAsState(if (pressed) 0.98f else 1f, label = "buttonScale")

    Box(
        modifier = modifier
            .height(height)
            .scale(scale.value)
            .background(
                brush = Brush.horizontalGradient(listOf(PrimaryPurple, PrimaryViolet)),
                shape = RoundedCornerShape(AppRadius.lg)
            )
            .clickable(
                enabled = enabled,
                interactionSource = interaction,
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(text = text, color = Color.White, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun CircularIconButton(
    onClick: () -> Unit,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed = interaction.collectIsPressedAsState().value
    val scale = animateFloatAsState(if (pressed) 0.98f else 1f, label = "iconButtonScale")

    Box(
        modifier = modifier
            .size(40.dp)
            .scale(scale.value)
            .background(
                color = SoftCardColor,
                shape = CircleShape
            )
            .border(1.dp, Color.White.copy(alpha = 0.6f), CircleShape)
            .clickable(interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        icon()
    }
}

@Composable
fun SoftCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Card(
        modifier = modifier.animateContentSize(),
        shape = RoundedCornerShape(AppRadius.md),
        colors = CardDefaults.cardColors(containerColor = SoftCardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = AppElevation.card)
    ) {
        content()
    }
}

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) = SoftCard(modifier = modifier, content = content)

@Composable
fun AppTextInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(AppRadius.md),
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = SoftCardColor,
            unfocusedContainerColor = SoftCardColor,
            focusedBorderColor = Color.Transparent,
            unfocusedBorderColor = Color.Transparent,
            focusedTextColor = MaterialTheme.colorScheme.onSurface,
            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
        )
    )
}

@Composable
fun CategoryPill(
    text: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val bg = if (selected) Brush.horizontalGradient(listOf(PrimaryPurple, PrimaryViolet)) else null
    Box(
        modifier = Modifier
            .background(
                brush = bg ?: Brush.horizontalGradient(listOf(SoftCardColor, SoftCardColor)),
                shape = RoundedCornerShape(AppRadius.lg)
            )
            .border(1.dp, Color.White.copy(alpha = 0.7f), RoundedCornerShape(AppRadius.lg))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp)
    ) {
        Text(
            text = text,
            color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
fun QuantityStepper(
    quantity: Int,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        CircularIconButton(
            onClick = onDecrease,
            icon = { Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = TextSecondary) },
            modifier = Modifier.size(32.dp)
        )
        Text(quantity.toString(), fontWeight = FontWeight.Bold)
        CircularIconButton(
            onClick = onIncrease,
            icon = { Icon(Icons.Default.Add, contentDescription = "Increase", tint = TextSecondary) },
            modifier = Modifier.size(32.dp)
        )
    }
}

@Composable
fun AppBadge(text: String, modifier: Modifier = Modifier) {
    Badge(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = Color.White
    ) {
        Text(text = text)
    }
}

@Composable
fun AppDiscountBadge(text: String, modifier: Modifier = Modifier) {
    Badge(
        modifier = modifier,
        containerColor = Color(0xFFFF6B6B),
        contentColor = Color.White
    ) {
        Text(text = text)
    }
}

@Composable
fun AppSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberInfiniteTransition(label = "skeleton")
    val alpha = shimmer.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.75f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "alpha"
    )
    Box(
        modifier = modifier
            .alpha(alpha.value)
            .background(Color(0xFFE9E6F8), RoundedCornerShape(AppRadius.sm))
    )
}

@Composable
fun ProductCardSkeleton(modifier: Modifier = Modifier) {
    SoftCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            AppSkeleton(modifier = Modifier.fillMaxWidth().height(120.dp))
            AppSkeleton(modifier = Modifier.fillMaxWidth().height(14.dp))
            AppSkeleton(modifier = Modifier.fillMaxWidth(0.6f).height(14.dp))
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun AppBottomSheet(
    visible: Boolean,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit
) {
    if (!visible) return
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = state,
        shape = RoundedCornerShape(topStart = AppRadius.lg, topEnd = AppRadius.lg)
    ) {
        content()
    }
}
