package com.cartify.data.repository

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

@Serializable
data class ProductTextReview(
    val productId: Int,
    val stars: Int,
    val comment: String,
    val createdAtMs: Long
)

@Serializable
data class WishlistAlertSettings(
    val priceDropAlerts: Boolean = true,
    val backInStockAlerts: Boolean = true
)

@Serializable
data class AddressBookEntry(
    val id: String = UUID.randomUUID().toString(),
    val label: String,
    val recipientName: String,
    val phone: String,
    val line1: String,
    val city: String,
    val notes: String = "",
    val isDefault: Boolean = false
)

@Serializable
data class AnalyticsSnapshot(
    val productViews: Int = 0,
    val addToCartAttempts: Int = 0,
    val wishlistAdds: Int = 0,
    val checkoutStarts: Int = 0,
    val checkoutSuccesses: Int = 0,
    val searches: Int = 0,
    val couponApplies: Int = 0,
    val supportRequests: Int = 0,
    val returnRequests: Int = 0,
    val storeVisits: Int = 0
)

@Serializable
data class CouponApplyResult(
    val isValid: Boolean,
    val normalizedCode: String = "",
    val discountAmount: Double = 0.0,
    val message: String
)

@Serializable
data class AccountSecurityState(
    val emailVerified: Boolean = false,
    val lastPasswordResetRequestMs: Long = 0L,
    val activeDevices: List<String> = listOf("Current device")
)

@Serializable
data class ModerationState(
    val flaggedReviewIds: Set<String> = emptySet(),
    val flaggedProductIds: Set<Int> = emptySet(),
    val blockedProductIds: Set<Int> = emptySet()
)

@Serializable
data class FeatureFlags(
    val recommendationsEnabled: Boolean = true,
    val smoothCategoryAnimationEnabled: Boolean = true,
    val reviewsEnabled: Boolean = true
)

@Serializable
data class ExperimentAssignment(
    val experimentId: String,
    val variant: String
)

class CommerceExperienceRepository(context: Context) {
    private val prefs = context.getSharedPreferences("cartify_experience", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    private val reviewsKey = "reviews_v1"
    private val alertsKey = "wishlist_alerts_v1"
    private val addressesKey = "address_book_v1"
    private val analyticsKey = "analytics_v1"
    private val viewedKey = "recently_viewed_ids_v1"
    private val returnsKey = "return_requests_v1"
    private val lowDataModeKey = "low_data_mode_v1"
    private val securityKey = "security_state_v1"
    private val moderationKey = "moderation_state_v1"
    private val flagsKey = "feature_flags_v1"
    private val experimentsKey = "experiments_v1"

    private val _reviews = MutableStateFlow(loadReviews())
    private val _wishlistAlerts = MutableStateFlow(loadWishlistAlerts())
    private val _addresses = MutableStateFlow(loadAddresses())
    private val _analytics = MutableStateFlow(loadAnalytics())
    private val _recentlyViewed = MutableStateFlow(loadRecentlyViewed())
    private val _returnRequests = MutableStateFlow(loadReturnRequests())
    private val _lowDataMode = MutableStateFlow(prefs.getBoolean(lowDataModeKey, false))
    private val _securityState = MutableStateFlow(loadSecurityState())
    private val _moderationState = MutableStateFlow(loadModerationState())
    private val _featureFlags = MutableStateFlow(loadFeatureFlags())
    private val _experiments = MutableStateFlow(loadExperiments())

    val reviews: StateFlow<List<ProductTextReview>> = _reviews.asStateFlow()
    val wishlistAlerts: StateFlow<WishlistAlertSettings> = _wishlistAlerts.asStateFlow()
    val addresses: StateFlow<List<AddressBookEntry>> = _addresses.asStateFlow()
    val analytics: StateFlow<AnalyticsSnapshot> = _analytics.asStateFlow()
    val recentlyViewed: StateFlow<List<Int>> = _recentlyViewed.asStateFlow()
    val returnRequests: StateFlow<Set<String>> = _returnRequests.asStateFlow()
    val lowDataMode: StateFlow<Boolean> = _lowDataMode.asStateFlow()
    val securityState: StateFlow<AccountSecurityState> = _securityState.asStateFlow()
    val moderationState: StateFlow<ModerationState> = _moderationState.asStateFlow()
    val featureFlags: StateFlow<FeatureFlags> = _featureFlags.asStateFlow()
    val experiments: StateFlow<List<ExperimentAssignment>> = _experiments.asStateFlow()

    fun addReview(productId: Int, stars: Int, comment: String) {
        val trimmed = comment.trim()
        if (trimmed.isBlank()) return
        val updated = (_reviews.value + ProductTextReview(productId, stars.coerceIn(1, 5), trimmed, System.currentTimeMillis()))
            .takeLast(200)
        _reviews.value = updated
        prefs.edit().putString(reviewsKey, json.encodeToString(updated)).apply()
    }

    fun reviewsForProduct(productId: Int): List<ProductTextReview> {
        return _reviews.value.filter { it.productId == productId }.sortedByDescending { it.createdAtMs }
    }

    fun isProductBlocked(productId: Int): Boolean = _moderationState.value.blockedProductIds.contains(productId)

    fun setWishlistAlerts(priceDrop: Boolean, backInStock: Boolean) {
        val updated = WishlistAlertSettings(priceDropAlerts = priceDrop, backInStockAlerts = backInStock)
        _wishlistAlerts.value = updated
        prefs.edit().putString(alertsKey, json.encodeToString(updated)).apply()
    }

    fun addAddress(entry: AddressBookEntry) {
        val normalized = if (_addresses.value.isEmpty()) entry.copy(isDefault = true) else entry
        val updated = (_addresses.value + normalized).let { list ->
            if (normalized.isDefault) list.map { if (it.id == normalized.id) it else it.copy(isDefault = false) } else list
        }
        _addresses.value = updated
        prefs.edit().putString(addressesKey, json.encodeToString(updated)).apply()
    }

    fun removeAddress(id: String) {
        val updated = _addresses.value.filterNot { it.id == id }
        _addresses.value = if (updated.none { it.isDefault } && updated.isNotEmpty()) {
            updated.mapIndexed { index, item -> item.copy(isDefault = index == 0) }
        } else {
            updated
        }
        prefs.edit().putString(addressesKey, json.encodeToString(_addresses.value)).apply()
    }

    fun setDefaultAddress(id: String) {
        val updated = _addresses.value.map { it.copy(isDefault = it.id == id) }
        _addresses.value = updated
        prefs.edit().putString(addressesKey, json.encodeToString(updated)).apply()
    }

    fun trackProductView(productId: Int) {
        val updated = listOf(productId) + _recentlyViewed.value.filterNot { it == productId }
        _recentlyViewed.value = updated.take(30)
        prefs.edit().putString(viewedKey, json.encodeToString(_recentlyViewed.value)).apply()
        incrementAnalytics { it.copy(productViews = it.productViews + 1) }
    }

    fun trackAddToCartAttempt() = incrementAnalytics { it.copy(addToCartAttempts = it.addToCartAttempts + 1) }
    fun trackWishlistAdd() = incrementAnalytics { it.copy(wishlistAdds = it.wishlistAdds + 1) }
    fun trackCheckoutStart() = incrementAnalytics { it.copy(checkoutStarts = it.checkoutStarts + 1) }
    fun trackCheckoutSuccess() = incrementAnalytics { it.copy(checkoutSuccesses = it.checkoutSuccesses + 1) }
    fun trackSearch() = incrementAnalytics { it.copy(searches = it.searches + 1) }
    fun trackCouponApply() = incrementAnalytics { it.copy(couponApplies = it.couponApplies + 1) }
    fun trackSupportRequest() = incrementAnalytics { it.copy(supportRequests = it.supportRequests + 1) }
    fun trackReturnRequest() = incrementAnalytics { it.copy(returnRequests = it.returnRequests + 1) }
    fun trackStoreVisit() = incrementAnalytics { it.copy(storeVisits = it.storeVisits + 1) }

    fun requestReturn(orderId: String) {
        val updated = _returnRequests.value + orderId
        _returnRequests.value = updated
        prefs.edit().putString(returnsKey, json.encodeToString(updated.toList())).apply()
        trackReturnRequest()
    }

    fun setLowDataMode(enabled: Boolean) {
        _lowDataMode.value = enabled
        prefs.edit().putBoolean(lowDataModeKey, enabled).apply()
    }

    fun markEmailVerified() {
        val updated = _securityState.value.copy(emailVerified = true)
        _securityState.value = updated
        prefs.edit().putString(securityKey, json.encodeToString(updated)).apply()
    }

    fun recordPasswordResetRequest() {
        val updated = _securityState.value.copy(lastPasswordResetRequestMs = System.currentTimeMillis())
        _securityState.value = updated
        prefs.edit().putString(securityKey, json.encodeToString(updated)).apply()
    }

    fun revokeOtherSessions() {
        val updated = _securityState.value.copy(activeDevices = listOf("Current device"))
        _securityState.value = updated
        prefs.edit().putString(securityKey, json.encodeToString(updated)).apply()
    }

    fun reportReview(reviewId: String) {
        val updated = _moderationState.value.copy(
            flaggedReviewIds = _moderationState.value.flaggedReviewIds + reviewId
        )
        _moderationState.value = updated
        prefs.edit().putString(moderationKey, json.encodeToString(updated)).apply()
    }

    fun flagProductForFraud(productId: Int) {
        val updated = _moderationState.value.copy(
            flaggedProductIds = _moderationState.value.flaggedProductIds + productId
        )
        _moderationState.value = updated
        prefs.edit().putString(moderationKey, json.encodeToString(updated)).apply()
    }

    fun setProductBlocked(productId: Int, blocked: Boolean) {
        val updated = if (blocked) {
            _moderationState.value.copy(blockedProductIds = _moderationState.value.blockedProductIds + productId)
        } else {
            _moderationState.value.copy(blockedProductIds = _moderationState.value.blockedProductIds - productId)
        }
        _moderationState.value = updated
        prefs.edit().putString(moderationKey, json.encodeToString(updated)).apply()
    }

    fun setFeatureFlags(flags: FeatureFlags) {
        _featureFlags.value = flags
        prefs.edit().putString(flagsKey, json.encodeToString(flags)).apply()
    }

    fun assignExperiment(experimentId: String, variantA: String = "A", variantB: String = "B"): String {
        _experiments.value.firstOrNull { it.experimentId == experimentId }?.let { return it.variant }
        val selected = if (System.currentTimeMillis() % 2L == 0L) variantA else variantB
        val updated = _experiments.value + ExperimentAssignment(experimentId, selected)
        _experiments.value = updated
        prefs.edit().putString(experimentsKey, json.encodeToString(updated)).apply()
        return selected
    }

    fun applyCoupon(code: String, subtotal: Double, shipping: Double): CouponApplyResult {
        val normalized = code.trim().uppercase()
        if (normalized.isBlank()) {
            return CouponApplyResult(false, message = "Enter a coupon code")
        }
        val result = when (normalized) {
            "SAVE10" -> CouponApplyResult(
                isValid = true,
                normalizedCode = normalized,
                discountAmount = (subtotal * 0.10).coerceAtLeast(0.0),
                message = "SAVE10 applied"
            )
            "WELCOME5" -> CouponApplyResult(
                isValid = true,
                normalizedCode = normalized,
                discountAmount = 5.0.coerceAtMost(subtotal),
                message = "WELCOME5 applied"
            )
            "FREESHIP" -> CouponApplyResult(
                isValid = true,
                normalizedCode = normalized,
                discountAmount = shipping.coerceAtLeast(0.0),
                message = "FREESHIP applied"
            )
            else -> CouponApplyResult(false, message = "Invalid coupon code")
        }
        if (result.isValid) trackCouponApply()
        return result
    }

    private fun incrementAnalytics(transform: (AnalyticsSnapshot) -> AnalyticsSnapshot) {
        val updated = transform(_analytics.value)
        _analytics.value = updated
        prefs.edit().putString(analyticsKey, json.encodeToString(updated)).apply()
    }

    private fun loadReviews(): List<ProductTextReview> {
        val raw = prefs.getString(reviewsKey, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<ProductTextReview>>(raw) }.getOrElse { emptyList() }
    }

    private fun loadWishlistAlerts(): WishlistAlertSettings {
        val raw = prefs.getString(alertsKey, null) ?: return WishlistAlertSettings()
        return runCatching { json.decodeFromString<WishlistAlertSettings>(raw) }.getOrElse { WishlistAlertSettings() }
    }

    private fun loadAddresses(): List<AddressBookEntry> {
        val raw = prefs.getString(addressesKey, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<AddressBookEntry>>(raw) }.getOrElse { emptyList() }
    }

    private fun loadAnalytics(): AnalyticsSnapshot {
        val raw = prefs.getString(analyticsKey, null) ?: return AnalyticsSnapshot()
        return runCatching { json.decodeFromString<AnalyticsSnapshot>(raw) }.getOrElse { AnalyticsSnapshot() }
    }

    private fun loadRecentlyViewed(): List<Int> {
        val raw = prefs.getString(viewedKey, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<Int>>(raw) }.getOrElse { emptyList() }
    }

    private fun loadReturnRequests(): Set<String> {
        val raw = prefs.getString(returnsKey, null) ?: return emptySet()
        return runCatching { json.decodeFromString<List<String>>(raw).toSet() }.getOrElse { emptySet() }
    }

    private fun loadSecurityState(): AccountSecurityState {
        val raw = prefs.getString(securityKey, null) ?: return AccountSecurityState()
        return runCatching { json.decodeFromString<AccountSecurityState>(raw) }.getOrElse { AccountSecurityState() }
    }

    private fun loadModerationState(): ModerationState {
        val raw = prefs.getString(moderationKey, null) ?: return ModerationState()
        return runCatching { json.decodeFromString<ModerationState>(raw) }.getOrElse { ModerationState() }
    }

    private fun loadFeatureFlags(): FeatureFlags {
        val raw = prefs.getString(flagsKey, null) ?: return FeatureFlags()
        return runCatching { json.decodeFromString<FeatureFlags>(raw) }.getOrElse { FeatureFlags() }
    }

    private fun loadExperiments(): List<ExperimentAssignment> {
        val raw = prefs.getString(experimentsKey, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<ExperimentAssignment>>(raw) }.getOrElse { emptyList() }
    }
}
