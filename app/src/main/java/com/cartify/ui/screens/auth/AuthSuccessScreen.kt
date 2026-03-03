package com.cartify.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cartify.ui.components.PillButton
import com.cartify.ui.theme.AuthColors
import com.cartify.ui.theme.AuthFont
import com.cartify.ui.theme.AuthRadius
import com.cartify.ui.theme.AuthSpacing

@Composable
fun AuthSuccessScreen(
    onBrowseHome: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AuthColors.Background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .blur(10.dp)
                .background(AuthColors.Body.copy(alpha = 0.06f))
        )
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = AuthSpacing.xl)
                .background(AuthColors.Background, RoundedCornerShape(AuthRadius.card))
                .padding(horizontal = AuthSpacing.xl, vertical = AuthSpacing.xxl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .background(AuthColors.Success.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(AuthColors.Success, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Check, contentDescription = "Success", tint = AuthColors.PrimaryText)
                }
            }
            Spacer(modifier = Modifier.height(AuthSpacing.lg))
            Text(
                text = "Successful!",
                fontSize = AuthFont.title,
                fontWeight = FontWeight.ExtraBold,
                color = AuthColors.Heading
            )
            Spacer(modifier = Modifier.height(AuthSpacing.xs))
            Text(
                text = "Your account is created successfully and ready now.",
                color = AuthColors.Body,
                fontSize = AuthFont.body,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(AuthSpacing.xl))
            PillButton(
                text = "Browse Home",
                onClick = onBrowseHome,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
