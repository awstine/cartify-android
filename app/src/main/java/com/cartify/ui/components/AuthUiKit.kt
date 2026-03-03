package com.cartify.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cartify.ui.theme.AuthColors
import com.cartify.ui.theme.AuthRadius
import com.cartify.ui.theme.AuthSpacing

@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed = interaction.collectIsPressedAsState().value
    val scale = animateFloatAsState(targetValue = if (pressed) 0.98f else 1f, label = "pillScale")
    Box(
        modifier = modifier
            .height(56.dp)
            .scale(scale.value)
            .background(
                color = if (enabled) AuthColors.Primary else AuthColors.Primary.copy(alpha = 0.6f),
                shape = RoundedCornerShape(AuthRadius.pill)
            )
            .clickable(
                enabled = enabled,
                interactionSource = interaction,
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(text = text, color = AuthColors.PrimaryText, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
    }
}

@Composable
fun SocialAuthButton(
    label: String,
    iconText: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .height(52.dp)
            .background(AuthColors.Background, RoundedCornerShape(AuthRadius.pill))
            .border(1.dp, AuthColors.Border, RoundedCornerShape(AuthRadius.pill))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .background(Color(0xFFF2F2F4), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(iconText, fontWeight = FontWeight.Bold, color = AuthColors.Heading)
        }
        Text(
            text = label,
            modifier = Modifier.padding(start = 8.dp),
            color = AuthColors.Heading,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun PillInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    isPassword: Boolean = false,
    error: String? = null
) {
    var passwordVisible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = AuthColors.Body) },
        singleLine = true,
        visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = {
            if (isPassword) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = if (passwordVisible) "Hide password" else "Show password",
                    tint = AuthColors.Body,
                    modifier = Modifier.clickable { passwordVisible = !passwordVisible }
                )
            }
        },
        shape = RoundedCornerShape(AuthRadius.field),
        modifier = modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = AuthColors.Surface,
            unfocusedContainerColor = AuthColors.Surface,
            focusedBorderColor = if (error == null) AuthColors.Border else AuthColors.SoftError,
            unfocusedBorderColor = if (error == null) AuthColors.Border else AuthColors.SoftError,
            focusedTextColor = AuthColors.Heading,
            unfocusedTextColor = AuthColors.Heading
        )
    )
    if (!error.isNullOrBlank()) {
        Text(
            text = error,
            color = AuthColors.SoftError,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 14.dp, top = 4.dp)
        )
    }
}

@Composable
fun DividerWithOr(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = AuthColors.Border)
        Text("or", color = AuthColors.Body, modifier = Modifier.padding(horizontal = AuthSpacing.md))
        HorizontalDivider(modifier = Modifier.weight(1f), color = AuthColors.Border)
    }
}

@Composable
fun ToggleRow(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    leftText: String,
    rightText: String? = null,
    onRightClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .clickable { onCheckedChange(!checked) },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .background(
                        color = if (checked) AuthColors.Primary else Color.Transparent,
                        shape = CircleShape
                    )
                    .border(
                        width = 1.dp,
                        color = if (checked) AuthColors.Primary else AuthColors.Border,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (checked) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = AuthColors.PrimaryText,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
            Text(leftText, color = AuthColors.Body, modifier = Modifier.padding(start = 8.dp))
        }
        if (!rightText.isNullOrBlank() && onRightClick != null) {
            Text(
                text = rightText,
                color = AuthColors.Link,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable(onClick = onRightClick)
            )
        }
    }
}

@Composable
fun BackIconButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(38.dp)
            .background(AuthColors.Surface, CircleShape)
            .border(1.dp, AuthColors.Border, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            tint = AuthColors.Heading
        )
    }
}
