package com.cartify.data.remote.backend

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.DELETE
import retrofit2.http.Path

interface BackendApiService {

    @POST("auth/signup")
    suspend fun signUp(@Body body: SignUpRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body body: AuthRequest): AuthResponse

    @GET("products")
    suspend fun getProducts(): List<BackendProduct>

    @GET("cart")
    suspend fun getCart(@Header("Authorization") bearerToken: String): CartResponse

    @POST("cart/items")
    suspend fun addToCart(
        @Header("Authorization") bearerToken: String,
        @Body body: AddCartItemRequest
    )

    @PATCH("cart/items/{productId}")
    suspend fun updateCartItem(
        @Header("Authorization") bearerToken: String,
        @Path("productId") productId: String,
        @Body body: UpdateCartItemRequest
    )

    @DELETE("cart/items/{productId}")
    suspend fun removeCartItem(
        @Header("Authorization") bearerToken: String,
        @Path("productId") productId: String
    )

    @POST("cart/checkout")
    suspend fun checkout(@Header("Authorization") bearerToken: String): CheckoutResponse

    @GET("users/me")
    suspend fun getProfile(@Header("Authorization") bearerToken: String): UserProfileResponse

    @PATCH("users/me")
    suspend fun updateProfile(
        @Header("Authorization") bearerToken: String,
        @Body body: UpdateProfileRequest
    ): UserProfileResponse

    @DELETE("users/me")
    suspend fun deleteAccount(@Header("Authorization") bearerToken: String): DeleteAccountResponse

    @GET("orders")
    suspend fun getOrders(@Header("Authorization") bearerToken: String): List<BackendOrder>

    @POST("orders/checkout")
    suspend fun checkoutFromClient(
        @Header("Authorization") bearerToken: String,
        @Body body: ClientCheckoutRequest
    ): CheckoutResponse

    @GET("wishlist")
    suspend fun getWishlist(@Header("Authorization") bearerToken: String): WishlistResponse

    @POST("wishlist/items")
    suspend fun addToWishlist(
        @Header("Authorization") bearerToken: String,
        @Body body: AddWishlistItemRequest
    )

    @DELETE("wishlist/items/{productId}")
    suspend fun removeWishlistItem(
        @Header("Authorization") bearerToken: String,
        @Path("productId") productId: String
    )
}
