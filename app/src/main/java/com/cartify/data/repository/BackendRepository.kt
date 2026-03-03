package com.cartify.data.repository

import com.cartify.data.remote.backend.AddCartItemRequest
import com.cartify.data.remote.backend.AddWishlistItemRequest
import com.cartify.data.remote.backend.AuthRequest
import com.cartify.data.remote.backend.AuthResponse
import com.cartify.data.remote.backend.BackendOrder
import com.cartify.data.remote.backend.BackendProduct
import com.cartify.data.remote.backend.BackendRetrofitInstance
import com.cartify.data.remote.backend.CartResponse
import com.cartify.data.remote.backend.CheckoutResponse
import com.cartify.data.remote.backend.ClientCheckoutItem
import com.cartify.data.remote.backend.ClientCheckoutRequest
import com.cartify.data.remote.backend.DeleteAccountResponse
import com.cartify.data.remote.backend.SignUpRequest
import com.cartify.data.remote.backend.UpdateProfileRequest
import com.cartify.data.remote.backend.UserProfileResponse
import com.cartify.data.remote.backend.UserPreferences
import com.cartify.data.remote.backend.WishlistResponse

/**
 * Backend repository scaffold for MongoDB-backed APIs.
 * This is intentionally decoupled from existing fake-store repositories to avoid breaking the app.
 */
class BackendRepository {

    suspend fun signUp(name: String, email: String, password: String): AuthResponse {
        return BackendRetrofitInstance.api.signUp(SignUpRequest(name, email, password))
    }

    suspend fun login(email: String, password: String): AuthResponse {
        return BackendRetrofitInstance.api.login(AuthRequest(email, password))
    }

    suspend fun getProducts(): List<BackendProduct> {
        return BackendRetrofitInstance.api.getProducts()
    }

    suspend fun getCart(token: String): CartResponse {
        return BackendRetrofitInstance.api.getCart(bearer(token))
    }

    suspend fun addToCart(token: String, productId: String, quantity: Int = 1) {
        BackendRetrofitInstance.api.addToCart(bearer(token), AddCartItemRequest(productId, quantity))
    }

    suspend fun checkout(token: String): CheckoutResponse {
        return BackendRetrofitInstance.api.checkout(bearer(token))
    }

    suspend fun checkoutFromClient(token: String, items: List<ClientCheckoutItem>): CheckoutResponse {
        return BackendRetrofitInstance.api.checkoutFromClient(
            bearer(token),
            ClientCheckoutRequest(items = items)
        )
    }

    suspend fun getProfile(token: String): UserProfileResponse {
        return BackendRetrofitInstance.api.getProfile(bearer(token))
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
        return BackendRetrofitInstance.api.updateProfile(bearer(token), request)
    }

    suspend fun deleteAccount(token: String): DeleteAccountResponse {
        return BackendRetrofitInstance.api.deleteAccount(bearer(token))
    }

    suspend fun getOrders(token: String): List<BackendOrder> {
        return BackendRetrofitInstance.api.getOrders(bearer(token))
    }

    suspend fun getWishlist(token: String): WishlistResponse {
        return BackendRetrofitInstance.api.getWishlist(bearer(token))
    }

    suspend fun addToWishlist(token: String, productId: String) {
        BackendRetrofitInstance.api.addToWishlist(bearer(token), AddWishlistItemRequest(productId))
    }

    suspend fun removeWishlistItem(token: String, productId: String) {
        BackendRetrofitInstance.api.removeWishlistItem(bearer(token), productId)
    }

    private fun bearer(token: String): String = "Bearer $token"
}
