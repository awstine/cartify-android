package com.cartify.ui.screens.more

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.cartify.data.remote.backend.BackendOrder
import com.cartify.data.remote.backend.WishlistItem
import com.cartify.data.remote.backend.UserProfileResponse
import com.cartify.data.repository.BackendRepository
import com.cartify.ui.components.AppCard
import com.cartify.ui.components.AppEmptyState
import com.cartify.ui.components.AppTextInput
import com.cartify.ui.components.ProductImage
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun CategoriesScreen(
    categories: List<String>,
    onCategoryClick: (String) -> Unit = {}
) {
    val visibleCategories = categories
        .map { it.trim() }
        .filter { it.isNotBlank() && !it.equals("all", ignoreCase = true) }
        .distinctBy { it.lowercase(Locale.getDefault()) }
        .sortedBy { it.lowercase(Locale.getDefault()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Text("Categories", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            "Browse departments and jump to filtered products.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(top = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(visibleCategories, key = { it }) { category ->
                Card(
                    modifier = Modifier.clickable { onCategoryClick(category) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.11f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            prettyCategoryLabel(category),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Tap to view products",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

private fun prettyCategoryLabel(raw: String): String {
    return raw
        .replace("-", " ")
        .split(" ")
        .filter { it.isNotBlank() }
        .joinToString(" ") { part ->
            part.lowercase(Locale.getDefault()).replaceFirstChar { ch ->
                if (ch.isLowerCase()) ch.titlecase(Locale.getDefault()) else ch.toString()
            }
        }
}

@Composable
fun ProfileScreen(
    displayName: String?,
    email: String?,
    profileImageUrl: String?,
    token: String?,
    initialNotificationsEnabled: Boolean,
    initialDarkModeEnabled: Boolean,
    onNotificationsChanged: (Boolean) -> Unit = {},
    onDarkModeChanged: (Boolean) -> Unit = {},
    onProfileUpdated: (UserProfileResponse) -> Unit = {},
    onAccountDeleted: () -> Unit = {},
    onOpenOrders: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val repository = remember { BackendRepository() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var selectedImageRef by remember { mutableStateOf(profileImageUrl?.trim().orEmpty()) }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            selectedImageRef = uri.toString()
        }
    }
    val dynamicState by produceState(
        initialValue = ProfileUiState(),
        token, displayName, email, profileImageUrl
    ) {
        val authToken = token?.trim().orEmpty()
        if (authToken.isBlank()) {
            value = ProfileUiState(
                name = displayName?.ifBlank { "Cartify User" } ?: "Cartify User",
                email = email?.ifBlank { "Signed in user" } ?: "Signed in user",
                profileImageUrl = profileImageUrl?.trim().orEmpty(),
                isLoading = false
            )
            return@produceState
        }

        val fallbackName = displayName?.ifBlank { "Cartify User" } ?: "Cartify User"
        val fallbackEmail = email?.ifBlank { "Signed in user" } ?: "Signed in user"
        val fallbackImageUrl = profileImageUrl?.trim().orEmpty()

        value = runCatching {
            val profile = repository.getProfile(authToken)
            val orders = repository.getOrders(authToken)
            val wishlist = repository.getWishlist(authToken)
            ProfileUiState(
                name = profile.name.ifBlank { fallbackName },
                email = profile.email.ifBlank { fallbackEmail },
                profileImageUrl = profile.profileImageUrl?.trim().orEmpty().ifBlank { fallbackImageUrl },
                memberSince = profile.createdAt?.take(10) ?: "N/A",
                ordersCount = orders.size,
                wishlistCount = wishlist.items.size,
                notificationsEnabled = profile.preferences?.notificationsEnabled ?: initialNotificationsEnabled,
                darkModeEnabled = profile.preferences?.darkModeEnabled ?: initialDarkModeEnabled,
                isLoading = false
            )
        }.getOrElse {
            ProfileUiState(
                name = fallbackName,
                email = fallbackEmail,
                profileImageUrl = fallbackImageUrl,
                notificationsEnabled = initialNotificationsEnabled,
                darkModeEnabled = initialDarkModeEnabled,
                isLoading = false,
                error = it.message ?: "Unable to load profile details"
            )
        }
    }

    var notificationsEnabled by remember(dynamicState.notificationsEnabled) { mutableStateOf(dynamicState.notificationsEnabled) }
    var darkModeEnabled by remember(dynamicState.darkModeEnabled) { mutableStateOf(dynamicState.darkModeEnabled) }
    var editableName by remember(dynamicState.name) { mutableStateOf(dynamicState.name) }
    var editableEmail by remember(dynamicState.email) { mutableStateOf(dynamicState.email) }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var revealSections by remember { mutableStateOf(false) }

    LaunchedEffect(dynamicState.profileImageUrl) {
        if (selectedImageRef.isBlank() && dynamicState.profileImageUrl.isNotBlank()) {
            selectedImageRef = dynamicState.profileImageUrl
        }
    }

    LaunchedEffect(darkModeEnabled) {
        onDarkModeChanged(darkModeEnabled)
    }

    LaunchedEffect(notificationsEnabled) {
        onNotificationsChanged(notificationsEnabled)
    }

    LaunchedEffect(Unit) {
        revealSections = true
    }

    fun persistPreferences() {
        onNotificationsChanged(notificationsEnabled)
        onDarkModeChanged(darkModeEnabled)
        val authToken = token?.trim().orEmpty()
        if (authToken.isBlank()) return

        scope.launch {
            val uploadableImageUrl = if (
                selectedImageRef.startsWith("http://") || selectedImageRef.startsWith("https://")
            ) {
                selectedImageRef
            } else {
                dynamicState.profileImageUrl.takeIf { it.startsWith("http://") || it.startsWith("https://") } ?: ""
            }
            runCatching {
                repository.updateProfile(
                    token = authToken,
                    name = editableName.trim(),
                    email = editableEmail.trim(),
                    profileImageUrl = uploadableImageUrl,
                    notificationsEnabled = notificationsEnabled,
                    darkModeEnabled = darkModeEnabled
                )
            }.onSuccess { updated ->
                onProfileUpdated(updated.copy(profileImageUrl = selectedImageRef.ifBlank { updated.profileImageUrl }))
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            ProfileSection(visible = revealSections, delayMillis = 0) {
                GlassCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.09f))
                            .padding(horizontal = 18.dp, vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            "Personal Hub",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Box(
                            modifier = Modifier
                                .scale(if (revealSections) 1f else 0.94f)
                                .size(86.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (selectedImageRef.isNotBlank()) {
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current)
                                        .data(selectedImageRef)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = "Profile image",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(86.dp)
                                        .clip(CircleShape)
                                )
                            } else {
                                Text(
                                    dynamicState.initial,
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }

                        Text(
                            editableName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            editableEmail,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            ProfileMetricChip("Orders", dynamicState.ordersCount.toString(), Modifier.weight(1f))
                            ProfileMetricChip("Wishlist", dynamicState.wishlistCount.toString(), Modifier.weight(1f))
                            ProfileMetricChip("Member", dynamicState.memberSince.take(4), Modifier.weight(1f))
                        }

                        if (!dynamicState.error.isNullOrBlank()) {
                            Text(
                                dynamicState.error ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }

        item {
            ProfileSection(visible = revealSections, delayMillis = 70) {
                GlassCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Controls", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Notifications", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Switch(
                                checked = notificationsEnabled,
                                onCheckedChange = {
                                    notificationsEnabled = it
                                    persistPreferences()
                                }
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Dark mode", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Switch(
                                checked = darkModeEnabled,
                                onCheckedChange = {
                                    darkModeEnabled = it
                                    persistPreferences()
                                }
                            )
                        }
                        ProfileActionButton(
                            text = "Open Orders",
                            icon = Icons.Default.ReceiptLong,
                            onClick = onOpenOrders,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ProfileActionButton(
                                text = "Upload Photo",
                                icon = Icons.Default.LocationOn,
                                onClick = { imagePicker.launch(arrayOf("image/*")) },
                                modifier = Modifier.weight(1f)
                            )
                            ProfileActionButton(
                                text = "Clear Photo",
                                icon = Icons.Default.DeleteOutline,
                                onClick = { selectedImageRef = "" },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }

        item {
            ProfileSection(visible = revealSections, delayMillis = 130) {
                GlassCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Edit Identity", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        AppTextInput(
                            value = editableName,
                            onValueChange = { editableName = it },
                            label = "Full name"
                        )
                        AppTextInput(
                            value = editableEmail,
                            onValueChange = { editableEmail = it },
                            label = "Email address"
                        )
                        Text(
                            "Member since ${dynamicState.memberSince}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        ProfileActionButton(
                            text = if (isSaving) "Saving..." else "Save changes",
                            icon = Icons.Default.Payment,
                            enabled = !isSaving && !isDeleting,
                            onClick = {
                                actionError = null
                                actionMessage = null
                                val authToken = token?.trim().orEmpty()
                                if (authToken.isBlank()) {
                                    actionError = "Session expired. Sign in again."
                                    return@ProfileActionButton
                                }
                                if (editableName.trim().length < 2) {
                                    actionError = "Name must have at least 2 characters"
                                    return@ProfileActionButton
                                }
                                if (!editableEmail.contains("@")) {
                                    actionError = "Enter a valid email"
                                    return@ProfileActionButton
                                }

                                isSaving = true
                                scope.launch {
                                    val uploadableImageUrl = if (
                                        selectedImageRef.startsWith("http://") || selectedImageRef.startsWith("https://")
                                    ) {
                                        selectedImageRef
                                    } else {
                                        dynamicState.profileImageUrl.takeIf {
                                            it.startsWith("http://") || it.startsWith("https://")
                                        } ?: ""
                                    }
                                    runCatching {
                                        repository.updateProfile(
                                            token = authToken,
                                            name = editableName.trim(),
                                            email = editableEmail.trim(),
                                            profileImageUrl = uploadableImageUrl,
                                            notificationsEnabled = notificationsEnabled,
                                            darkModeEnabled = darkModeEnabled
                                        )
                                    }
                                        .onSuccess { updated ->
                                            onProfileUpdated(updated.copy(profileImageUrl = selectedImageRef.ifBlank { updated.profileImageUrl }))
                                            actionMessage = "Profile updated"
                                        }
                                        .onFailure {
                                            actionError = it.message ?: "Unable to update profile"
                                        }
                                    isSaving = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (!actionMessage.isNullOrBlank()) {
                            Text(actionMessage ?: "", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                        }
                        if (!actionError.isNullOrBlank()) {
                            Text(actionError ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }

        item {
            ProfileSection(visible = revealSections, delayMillis = 190) {
                GlassCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Danger Zone", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text(
                            "Deleting your account removes profile and shopping history.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ProfileActionButton(
                                text = if (isDeleting) "Deleting..." else "Delete account",
                                icon = Icons.Default.DeleteOutline,
                                enabled = !isDeleting && !isSaving,
                                onClick = {
                                    val authToken = token?.trim().orEmpty()
                                    if (authToken.isBlank()) {
                                        actionError = "Session expired. Sign in again."
                                        return@ProfileActionButton
                                    }
                                    isDeleting = true
                                    scope.launch {
                                        runCatching { repository.deleteAccount(authToken) }
                                            .onSuccess {
                                                onAccountDeleted()
                                            }
                                            .onFailure {
                                                actionError = it.message ?: "Unable to delete account"
                                            }
                                        isDeleting = false
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                danger = true
                            )
                            ProfileActionButton(
                                text = "Logout",
                                icon = Icons.Default.ChevronRight,
                                onClick = onLogout,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileSection(
    visible: Boolean,
    delayMillis: Int,
    content: @Composable () -> Unit
) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(animationSpec = tween(durationMillis = 320, delayMillis = delayMillis)) +
            slideInVertically(
                animationSpec = tween(durationMillis = 320, delayMillis = delayMillis),
                initialOffsetY = { it / 5 }
            )
    ) {
        content()
    }
}

@Composable
private fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    AppCard(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f),
                    shape = RoundedCornerShape(14.dp)
                )
        ) {
            content()
        }
    }
}

@Composable
private fun ProfileMetricChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
            .padding(vertical = 10.dp, horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ProfileActionButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    danger: Boolean = false
) {
    val contentColor = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
    val bgColor = if (danger) {
        MaterialTheme.colorScheme.error.copy(alpha = 0.10f)
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
    }
    val borderColor = if (danger) {
        MaterialTheme.colorScheme.error.copy(alpha = 0.35f)
    } else {
        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    }

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 11.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = text, tint = contentColor, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.size(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = contentColor
        )
    }
}

@Composable
private fun ProfileItemRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .let { base -> if (onClick != null) base.clickable { onClick() } else base }
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f),
                shape = RoundedCornerShape(14.dp)
            )
            .padding(horizontal = 10.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = title, tint = MaterialTheme.colorScheme.primary)
        }
        Column(modifier = Modifier.weight(1f).padding(start = 10.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun WishlistScreen(
    token: String?,
    onProductClick: (String) -> Unit = {},
    onWishlistChanged: (Set<String>) -> Unit = {}
) {
    val repository = remember { BackendRepository() }
    var state by remember(token) { mutableStateOf(WishlistUiState(isLoading = true)) }

    LaunchedEffect(token) {
        val authToken = token?.trim()
        if (authToken.isNullOrEmpty()) {
            state = WishlistUiState(error = "Missing session token")
            return@LaunchedEffect
        }

        state = runCatching { repository.getWishlist(authToken) }
            .fold(
                onSuccess = { wishlist ->
                    val ids = wishlist.items.map { it.productId }.toSet()
                    onWishlistChanged(ids)
                    WishlistUiState(items = wishlist.items)
                },
                onFailure = { WishlistUiState(error = it.message ?: "Unable to load wishlist") }
            )
    }

    val scope = rememberCoroutineScope()
    val authToken = token?.trim().orEmpty()
    var removingProductId by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Text("Wishlist", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            "Saved items to buy later",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        when {
            state.isLoading -> {
                Spacer(modifier = Modifier.height(14.dp))
                Text("Loading wishlist...", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            state.error != null -> {
                Spacer(modifier = Modifier.height(14.dp))
                Text(state.error ?: "Unable to load wishlist", color = MaterialTheme.colorScheme.error)
            }

            state.items.isEmpty() -> {
                Spacer(modifier = Modifier.height(12.dp))
                AppEmptyState("Wishlist is empty", "Save products and they will show here.")
            }

            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.items, key = { it.productId }) { item ->
                        val product = item.product
                        AppCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onProductClick(item.productId)
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                ProductImage(
                                    model = product?.imageUrl.orEmpty(),
                                    contentDescription = product?.title ?: "Wishlist product",
                                    modifier = Modifier
                                        .size(72.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)),
                                    contentScale = ContentScale.Crop
                                )
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(start = 10.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        product?.title ?: "Product unavailable",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        product?.category?.replaceFirstChar { it.uppercase() } ?: "Unknown category",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        "KSh ${"%.2f".format(product?.price ?: 0.0)}",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.12f))
                                        .clickable(enabled = removingProductId != item.productId) {
                                            if (authToken.isBlank()) return@clickable
                                            removingProductId = item.productId
                                            actionError = null
                                            scope.launch {
                                                runCatching { repository.removeWishlistItem(authToken, item.productId) }
                                                    .onSuccess {
                                                        val updatedIds =
                                                            state.items.filterNot { it.productId == item.productId }.map { it.productId }.toSet()
                                                        onWishlistChanged(updatedIds)
                                                        state = WishlistUiState(
                                                            items = state.items.filterNot { it.productId == item.productId }
                                                        )
                                                    }
                                                    .onFailure {
                                                        actionError = it.message ?: "Unable to remove item"
                                                    }
                                                removingProductId = null
                                            }
                                        }
                                        .padding(8.dp)
                                ) {
                                    Icon(
                                        Icons.Default.DeleteOutline,
                                        contentDescription = "Remove from wishlist",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!actionError.isNullOrBlank()) {
            Text(
                actionError ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
fun OrdersScreen(token: String?) {
    val repository = remember { BackendRepository() }
    val state by produceState<OrdersUiState>(initialValue = OrdersUiState(isLoading = true), token) {
        val authToken = token?.trim()
        if (authToken.isNullOrEmpty()) {
            value = OrdersUiState(error = "Missing session token")
            return@produceState
        }

        value = runCatching { repository.getOrders(authToken) }
            .fold(
                onSuccess = { orders -> OrdersUiState(orders = orders) },
                onFailure = { OrdersUiState(error = it.message ?: "Unable to load orders") }
            )
    }

    when {
        state.isLoading -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf("Loading orders...")
        )

        state.error != null -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf(state.error ?: "Unable to load orders")
        )

        state.orders.isEmpty() -> SimpleListPage(
            title = "Orders",
            subtitle = "Recent order activity",
            rows = listOf("No orders yet")
        )

        else -> {
            val rows = state.orders.map { order ->
                val shortId = if (order.id.length > 8) order.id.takeLast(8) else order.id
                val date = order.createdAt.take(10)
                val itemCount = order.items.sumOf { it.quantity }
                val productPreview = order.items.take(2).joinToString(", ") { it.title }
                val moreLabel = if (order.items.size > 2) " +${order.items.size - 2} more" else ""
                "Order #$shortId - ${order.status.replaceFirstChar { it.uppercase() }} - $itemCount item(s): $productPreview$moreLabel - KSh ${"%.2f".format(order.total)} - $date"
            }
            SimpleListPage(
                title = "Orders",
                subtitle = "Recent order activity",
                rows = rows
            )
        }
    }
}

@Composable
fun OffersScreen() = SimpleListPage(
    title = "Offers",
    subtitle = "Latest campaigns and discounts",
    rows = listOf("Up to 40% off electronics", "Weekend buy-1-get-1 fashion", "Free shipping over KSh 50")
)

@Composable
fun SettingsScreen() = SimpleListPage(
    title = "Settings",
    subtitle = "General app preferences",
    rows = listOf("Theme and display", "Language and region", "Privacy controls", "Security")
)

@Composable
fun HelpScreen() = SimpleListPage(
    title = "Help",
    subtitle = "Support and policy information",
    rows = listOf("Contact support", "Returns and refunds", "Shipping policy", "FAQ")
)

@Composable
fun AboutScreen() = SimpleListPage(
    title = "About",
    subtitle = "App information",
    rows = listOf("Cartify Android app", "Version 1.0", "Built with Jetpack Compose")
)

@Composable
private fun SimpleListPage(
    title: String,
    subtitle: String,
    rows: List<String>
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        LazyColumn(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(rows) { row ->
                AppCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(row, modifier = Modifier.weight(1f))
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

private data class OrdersUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val orders: List<BackendOrder> = emptyList()
)

private data class WishlistUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val items: List<WishlistItem> = emptyList()
)

private data class ProfileUiState(
    val name: String = "Cartify User",
    val email: String = "Signed in user",
    val profileImageUrl: String = "",
    val memberSince: String = "N/A",
    val ordersCount: Int = 0,
    val wishlistCount: Int = 0,
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null
) {
    val initial: String
        get() = name.firstOrNull()?.uppercase() ?: "C"
}

@Composable
private fun ProfileStatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier
) {
    AppCard(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
                .padding(vertical = 12.dp, horizontal = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            Text(
                title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
