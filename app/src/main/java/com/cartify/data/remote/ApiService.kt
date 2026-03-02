package com.cartify.data.remote

import com.cartify.data.model.Cart
import com.cartify.data.model.Product
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @GET("products")
    suspend fun getProducts(): List<Product>

    @GET("carts")
    suspend fun getCart(): List<Cart>

    @POST("carts")
    suspend fun addToCart(@Body cart: Cart)

    @DELETE("carts/{id}")
    suspend fun deleteCart(@Path("id") id: Int)

}