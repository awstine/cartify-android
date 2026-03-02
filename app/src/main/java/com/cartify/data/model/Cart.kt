package com.cartify.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Cart(
    val id: Int,
    val userId: Int,
    val date: String,
    val products: List<ProductInfo>
)

@Serializable
data class ProductInfo(
    val productId: Int,
    val quantity: Int
)