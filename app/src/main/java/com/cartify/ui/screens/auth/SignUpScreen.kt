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

@Composable
@Suppress("FunctionName")
fun SignUpScreen(
    viewModel: AuthViewModel,
    onSignUpSuccess: () -> Unit,
    onLoginClicked: () -> Unit,
    onBack: () -> Unit = {}
) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var termsAccepted by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var termsError by remember { mutableStateOf<String?>(null) }
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        when (authState) {
            is AuthState.Success -> {
                onSignUpSuccess()
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
            text = "Create your account",
            fontSize = AuthFont.title,
            fontWeight = FontWeight.ExtraBold,
            color = AuthColors.Heading,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(AuthSpacing.xs))
        Text(
            text = "Join Cartify for faster checkout and order tracking",
            fontSize = AuthFont.subtitle,
            color = AuthColors.Body,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(AuthSpacing.lg))
        PillInput(
            value = fullName,
            onValueChange = {
                fullName = it
                nameError = null
            },
            placeholder = "Full Name",
            error = nameError
        )
        Spacer(modifier = Modifier.height(AuthSpacing.sm))
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
            checked = termsAccepted,
            onCheckedChange = {
                termsAccepted = it
                termsError = null
            },
            leftText = "I agree to Terms & Privacy Policy"
        )
        if (!termsError.isNullOrBlank()) {
            Text(
                text = termsError ?: "",
                color = AuthColors.SoftError,
                fontSize = AuthFont.body,
                modifier = Modifier.padding(top = AuthSpacing.xs, start = AuthSpacing.sm)
            )
        }
        Spacer(modifier = Modifier.height(AuthSpacing.lg))
        if (authState is AuthState.Loading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
        } else {
            PillButton(
                text = "Create Account",
                onClick = {
                    nameError = if (fullName.trim().length < 3) "Enter your full name" else null
                    emailError = if (email.isBlank() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                        "Enter a valid email address"
                    } else {
                        null
                    }
                    passwordError = if (password.length < 6) "Password must be at least 6 characters" else null
                    termsError = if (!termsAccepted) "Accept terms to continue" else null
                    if (nameError == null && emailError == null && passwordError == null && termsError == null) {
                        viewModel.signUp(fullName.trim(), email.trim(), password, password)
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
        }
        Spacer(modifier = Modifier.height(AuthSpacing.md))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text("Already have an account? ", color = AuthColors.Body)
            TextButton(onClick = onLoginClicked) {
                Text("Sign In", color = AuthColors.Link, fontWeight = FontWeight.SemiBold)
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
