package com.cartify.ui.screens.auth

import android.util.Patterns
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.cartify.ui.components.BackIconButton
import com.cartify.ui.components.DividerWithOr
import com.cartify.ui.components.PillButton
import com.cartify.ui.components.PillInput
import com.cartify.ui.components.SocialAuthButton
import com.cartify.ui.components.ToggleRow
import com.cartify.ui.theme.AuthColors
import com.cartify.ui.theme.AuthFont
import com.cartify.ui.theme.AuthSpacing

@Suppress("FunctionName")
@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit,
    onSignUpClicked: () -> Unit,
    onBack: () -> Unit = {}
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Success -> {
                onLoginSuccess()
                viewModel.resetState()
            }
            else -> Unit
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AuthColors.Background)
            .padding(horizontal = AuthSpacing.xl, vertical = AuthSpacing.lg)
            .verticalScroll(rememberScrollState())
    ) {
        BackIconButton(onClick = onBack)
        Spacer(modifier = Modifier.height(AuthSpacing.xl))
        Text(
            text = "Welcome Back",
            fontSize = AuthFont.title,
            fontWeight = FontWeight.ExtraBold,
            color = AuthColors.Heading,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(AuthSpacing.xs))
        Text(
            text = "Sign in to continue shopping",
            fontSize = AuthFont.subtitle,
            color = AuthColors.Body,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(AuthSpacing.lg))
        PillInput(
            value = email,
            onValueChange = {
                email = it
                emailError = null
            },
            placeholder = "Email Address",
            error = emailError
        )
        Spacer(modifier = Modifier.height(AuthSpacing.sm))
        PillInput(
            value = password,
            onValueChange = {
                password = it
                passwordError = null
            },
            placeholder = "Password",
            isPassword = true,
            error = passwordError
        )
        Spacer(modifier = Modifier.height(AuthSpacing.sm))
        ToggleRow(
            checked = rememberMe,
            onCheckedChange = { rememberMe = it },
            leftText = "Remember me",
            rightText = "Forgot Password?",
            onRightClick = {}
        )
        Spacer(modifier = Modifier.height(AuthSpacing.lg))
        if (authState is AuthState.Loading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else {
            PillButton(
                text = "Sign In",
                onClick = {
                    emailError = if (email.isBlank() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                        "Enter a valid email address"
                    } else {
                        null
                    }
                    passwordError = if (password.length < 6) "Password must be at least 6 characters" else null
                    if (emailError == null && passwordError == null) {
                        viewModel.login(email.trim(), password)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
        }
        if (authState is AuthState.Error) {
            Text(
                text = (authState as AuthState.Error).message,
                color = AuthColors.SoftError,
                fontSize = AuthFont.body,
                modifier = Modifier
                    .padding(top = AuthSpacing.sm)
                    .fillMaxWidth(),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(AuthSpacing.sm))
            PillButton(
                text = "Retry",
                onClick = { viewModel.login(email.trim(), password) },
                modifier = Modifier.fillMaxWidth()
            )
        }
        Spacer(modifier = Modifier.height(AuthSpacing.md))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text("Don't have an account? ", color = AuthColors.Body)
            TextButton(onClick = onSignUpClicked) {
                Text("Sign Up", color = AuthColors.Link, fontWeight = FontWeight.SemiBold)
            }
        }
        Spacer(modifier = Modifier.height(AuthSpacing.md))
        DividerWithOr()
        Spacer(modifier = Modifier.height(AuthSpacing.md))
        SocialAuthButton(
            label = "Continue with Google",
            iconText = "G",
            onClick = {},
            modifier = Modifier.fillMaxWidth()
        )
    }
}
