package com.cartify.data.model

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: Int,
    val title: String,
    val price: Double,
    val description: String,
    val category: String,
    @SerializedName("image") val imageUrl: String,
)

@Serializable
data class Products(val products: List<Product>)
