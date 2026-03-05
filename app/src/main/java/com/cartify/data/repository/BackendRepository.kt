package com.cartify.data.repository

import com.cartify.data.remote.backend.AddCartItemRequest
import com.cartify.data.remote.backend.AddWishlistItemRequest
import com.cartify.data.remote.backend.AuthRequest
import com.cartify.data.remote.backend.AuthResponse
import com.cartify.data.remote.backend.BackendOrder
import com.cartify.data.remote.backend.BackendProduct
import com.cartify.data.remote.backend.BackendStore
import com.cartify.data.remote.backend.BackendRetrofitInstance
import com.cartify.data.remote.backend.CartResponse
import com.cartify.data.remote.backend.CheckoutResponse
import com.cartify.data.remote.backend.ClientCheckoutItem
import com.cartify.data.remote.backend.ClientCheckoutRequest
import com.cartify.data.remote.backend.DeleteAccountResponse
import com.cartify.data.remote.backend.SignUpRequest
import com.cartify.data.remote.backend.SubmitProductReviewRequest
import com.cartify.data.remote.backend.SubmitProductReviewResponse
import com.cartify.data.remote.backend.UpdateProfileRequest
import com.cartify.data.remote.backend.UserProfileResponse
import com.cartify.data.remote.backend.UserPreferences
import com.cartify.data.remote.backend.WishlistResponse
import retrofit2.HttpException

/**
 * Backend repository scaffold for MongoDB-backed APIs.
 * This is intentionally decoupled from existing fake-store repositories to avoid breaking the app.
 */
class BackendRepository {
    companion object {
        private const val CACHE_TTL_MS = 60_000L
        private val wishlistCache = mutableMapOf<String, CacheEntry<WishlistResponse>>()
        private val ordersCache = mutableMapOf<String, CacheEntry<List<BackendOrder>>>()
        private val profileCache = mutableMapOf<String, CacheEntry<UserProfileResponse>>()
        private val cartCache = mutableMapOf<String, CacheEntry<CartResponse>>()
        private val productsCache = mutableMapOf<String, CacheEntry<List<BackendProduct>>>()
        private var storesCache: CacheEntry<List<BackendStore>>? = null
    }

    private data class CacheEntry<T>(
        val value: T,
        val timestampMs: Long
    )

    private fun nowMs(): Long = System.currentTimeMillis()

    private fun <T> readCache(entry: CacheEntry<T>?): T? {
        if (entry == null) return null
        return if (nowMs() - entry.timestampMs <= CACHE_TTL_MS) entry.value else null
    }

    private fun <T> readStaleCache(entry: CacheEntry<T>?): T? = entry?.value

    suspend fun signUp(name: String, email: String, password: String): AuthResponse {
        return BackendRetrofitInstance.api.signUp(SignUpRequest(name, email, password))
    }

    suspend fun login(email: String, password: String): AuthResponse {
        return BackendRetrofitInstance.api.login(AuthRequest(email, password))
    }

    suspend fun getProducts(storeSlug: String? = null): List<BackendProduct> {
        val key = storeSlug?.trim().orEmpty().ifBlank { "__all__" }
        val stale = readStaleCache(productsCache[key])
        return runCatching { BackendRetrofitInstance.api.getProducts(storeSlug = storeSlug) }
            .onSuccess { productsCache[key] = CacheEntry(it, nowMs()) }
            .getOrElse { throwable ->
                stale ?: throw throwable
            }
    }

    suspend fun getStores(): List<BackendStore> {
        val stale = readStaleCache(storesCache)
        return try {
            BackendRetrofitInstance.api.getStores()
                .also { storesCache = CacheEntry(it, nowMs()) }
        } catch (http: HttpException) {
            if (http.code() == 404) {
                BackendRetrofitInstance.api.getStoresFromApiRoot()
                    .also { storesCache = CacheEntry(it, nowMs()) }
            } else {
                stale ?: throw http
            }
        } catch (t: Throwable) {
            stale ?: throw t
        }
    }

    suspend fun getCart(token: String): CartResponse {
        readCache(cartCache[token])?.let { return it }
        val response = BackendRetrofitInstance.api.getCart(bearer(token))
        cartCache[token] = CacheEntry(response, nowMs())
        return response
    }

    suspend fun addToCart(token: String, productId: String, quantity: Int = 1) {
        BackendRetrofitInstance.api.addToCart(bearer(token), AddCartItemRequest(productId, quantity))
        cartCache.remove(token)
    }

    suspend fun checkout(token: String): CheckoutResponse {
        val response = BackendRetrofitInstance.api.checkout(bearer(token))
        cartCache.remove(token)
        ordersCache.remove(token)
        return response
    }

    suspend fun checkoutFromClient(token: String, items: List<ClientCheckoutItem>): CheckoutResponse {
        val response = BackendRetrofitInstance.api.checkoutFromClient(
            bearer(token),
            ClientCheckoutRequest(items = items)
        )
        cartCache.remove(token)
        ordersCache.remove(token)
        return response
    }

    suspend fun getProfile(token: String): UserProfileResponse {
        readCache(profileCache[token])?.let { return it }
        val response = BackendRetrofitInstance.api.getProfile(bearer(token))
        profileCache[token] = CacheEntry(response, nowMs())
        return response
    }

    suspend fun updateProfile(
        token: String,
        name: String,
        email: String,
        profileImageUrl: String,
        notificationsEnabled: Boolean,
        darkModeEnabled: Boolean
    ): UserProfileResponse {
        val request = UpdateProfileRequest(
            name = name,
            email = email,
            profileImageUrl = profileImageUrl,
            preferences = UserPreferences(
                notificationsEnabled = notificationsEnabled,
                darkModeEnabled = darkModeEnabled
            )
        )
        val response = BackendRetrofitInstance.api.updateProfile(bearer(token), request)
        profileCache[token] = CacheEntry(response, nowMs())
        return response
    }

    suspend fun deleteAccount(token: String): DeleteAccountResponse {
        val response = BackendRetrofitInstance.api.deleteAccount(bearer(token))
        wishlistCache.remove(token)
        ordersCache.remove(token)
        profileCache.remove(token)
        cartCache.remove(token)
        return response
    }

    suspend fun getOrders(token: String): List<BackendOrder> {
        readCache(ordersCache[token])?.let { return it }
        val response = BackendRetrofitInstance.api.getOrders(bearer(token))
        ordersCache[token] = CacheEntry(response, nowMs())
        return response
    }

    suspend fun getWishlist(token: String): WishlistResponse {
        readCache(wishlistCache[token])?.let { return it }
        val response = BackendRetrofitInstance.api.getWishlist(bearer(token))
        wishlistCache[token] = CacheEntry(response, nowMs())
        return response
    }

    suspend fun addToWishlist(token: String, productId: String) {
        BackendRetrofitInstance.api.addToWishlist(bearer(token), AddWishlistItemRequest(productId))
        wishlistCache.remove(token)
    }

    suspend fun removeWishlistItem(token: String, productId: String) {
        BackendRetrofitInstance.api.removeWishlistItem(bearer(token), productId)
        wishlistCache.remove(token)
    }

    suspend fun submitProductReview(
        token: String,
        productId: String,
        rating: Int,
        comment: String
    ): SubmitProductReviewResponse {
        return BackendRetrofitInstance.api.submitProductReview(
            bearer(token),
            productId,
            SubmitProductReviewRequest(
                rating = rating.coerceIn(1, 5),
                comment = comment.trim()
            )
        )
    }

    suspend fun prefetchForRoute(token: String, route: String) {
        when (route) {
            "wishlist" -> {
                runCatching { getWishlist(token) }
            }
            "cart" -> {
                runCatching { getCart(token) }
            }
            "orders" -> {
                runCatching { getOrders(token) }
            }
            "profile" -> {
                runCatching { getProfile(token) }
                runCatching { getWishlist(token) }
                runCatching { getOrders(token) }
            }
        }
    }

    private fun bearer(token: String): String = "Bearer $token"
}
