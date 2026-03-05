package com.cartify.data.remote.backend

import com.google.gson.annotations.SerializedName

data class BackendUser(
    val id: String,
    val name: String,
    val email: String,
    val profileImageUrl: String? = null
)

data class AuthResponse(
    val token: String,
    val user: BackendUser
)

data class AuthRequest(
    val email: String,
    val password: String
)

data class SignUpRequest(
    val name: String,
    val email: String,
    val password: String
)

data class BackendProduct(
    @SerializedName("_id") val id: String,
    val title: String,
    val description: String,
    val category: String,
    val imageUrl: String? = null,
    val images: List<String>? = null,
    @SerializedName("storeId") val storeId: String? = null,
    val storeSlug: String? = null,
    val sizes: List<String>? = null,
    val variants: List<BackendVariant>? = null,
    val price: Double,
    val stock: Int? = null,
    @SerializedName("stockQty") val stockQty: Int? = null,
    val quantity: Int? = null,
    @SerializedName("countInStock") val countInStock: Int? = null
)

data class BackendVariant(
    val size: String? = null
)

data class BackendCartItem(
    val productId: String,
    val quantity: Int,
    val product: BackendProduct?
)

data class CartResponse(
    val items: List<BackendCartItem>
)

data class AddCartItemRequest(
    val productId: String,
    val quantity: Int = 1
)

data class AddWishlistItemRequest(
    val productId: String
)

data class UpdateCartItemRequest(
    val quantityDelta: Int
)

data class CheckoutSummary(
    val subtotal: Double,
    val shipping: Double,
    val tax: Double,
    val total: Double
)

data class CheckoutResponse(
    val message: String,
    val orderId: String?,
    val summary: CheckoutSummary
)

data class ClientCheckoutItem(
    val title: String,
    val imageUrl: String,
    val price: Double,
    val quantity: Int
)

data class ClientCheckoutRequest(
    val items: List<ClientCheckoutItem>
)

data class UserProfileResponse(
    val id: String,
    val name: String,
    val email: String,
    val profileImageUrl: String? = null,
    val preferences: UserPreferences? = null,
    val createdAt: String?
)

data class UserPreferences(
    val notificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false
)

data class UpdateProfileRequest(
    val name: String,
    val email: String,
    val profileImageUrl: String,
    val preferences: UserPreferences
)

data class DeleteAccountResponse(
    val message: String
)

data class BackendOrderItem(
    val productId: String? = null,
    val title: String,
    val imageUrl: String,
    val price: Double,
    val quantity: Int,
    val lineTotal: Double
)

data class BackendOrder(
    @SerializedName("_id") val id: String,
    val userId: String,
    val items: List<BackendOrderItem>,
    val subtotal: Double,
    val shipping: Double,
    val tax: Double,
    val total: Double,
    val status: String,
    val createdAt: String
)

data class WishlistItem(
    val productId: String,
    val product: BackendProduct?
)

data class WishlistResponse(
    val items: List<WishlistItem>
)

data class BackendStore(
    @SerializedName("_id") val id: String,
    val name: String,
    val slug: String,
    val description: String? = null,
    val logoUrl: String? = null,
    val isActive: Boolean = true
)
