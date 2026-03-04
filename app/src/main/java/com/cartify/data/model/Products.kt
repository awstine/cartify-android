package com.cartify.data.model

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: Int,
    val backendId: String = "",
    val title: String,
    val price: Double,
    val description: String,
    val category: String,
    @SerializedName("image") val imageUrl: String,
    val imageUrls: List<String> = emptyList(),
    val stock: Int = 0,
    val rating: ProductRating? = null,
)

@Serializable
data class ProductRating(
    val rate: Double = 0.0,
    val count: Int = 0
)

@Serializable
data class Products(val products: List<Product>)
