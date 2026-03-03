package com.cartify.data.repository

import android.content.Context
import com.cartify.data.model.Product
import com.cartify.data.model.ProductInfo
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class CartRepository(context: Context) {
    private val preferences = context.getSharedPreferences("cartify_cart", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }
    private val key = "cart_items"

    private val _cart = MutableStateFlow(loadSavedCart())
    val cart: StateFlow<List<ProductInfo>> = _cart

    fun addToCart(product: Product) {
        val currentCart = _cart.value.toMutableList()
        val existingProduct = currentCart.find { it.productId == product.id }

        if (existingProduct != null) {
            val updatedProduct = existingProduct.copy(quantity = existingProduct.quantity + 1)
            val productIndex = currentCart.indexOf(existingProduct)
            currentCart[productIndex] = updatedProduct
        } else {
            currentCart.add(ProductInfo(productId = product.id, quantity = 1))
        }
        _cart.value = currentCart
        persistCart()
    }

    fun clearCart() {
        _cart.value = emptyList()
        persistCart()
    }

    fun increaseQuantity(productId: Int) {
        val currentCart = _cart.value.toMutableList()
        val existingProduct = currentCart.find { it.productId == productId }

        if (existingProduct != null) {
            val updatedProduct = existingProduct.copy(quantity = existingProduct.quantity + 1)
            val productIndex = currentCart.indexOf(existingProduct)
            currentCart[productIndex] = updatedProduct
            _cart.value = currentCart
            persistCart()
        }
    }

    fun decreaseQuantity(productId: Int) {
        val currentCart = _cart.value.toMutableList()
        val existingProduct = currentCart.find { it.productId == productId }

        if (existingProduct != null) {
            if (existingProduct.quantity > 1) {
                val updatedProduct = existingProduct.copy(quantity = existingProduct.quantity - 1)
                val productIndex = currentCart.indexOf(existingProduct)
                currentCart[productIndex] = updatedProduct
            } else {
                currentCart.remove(existingProduct)
            }
            _cart.value = currentCart
            persistCart()
        }
    }

    fun removeItem(productId: Int) {
        _cart.value = _cart.value.filterNot { it.productId == productId }
        persistCart()
    }

    private fun persistCart() {
        preferences.edit()
            .putString(key, json.encodeToString(_cart.value))
            .apply()
    }

    private fun loadSavedCart(): List<ProductInfo> {
        val raw = preferences.getString(key, null) ?: return emptyList()
        return runCatching { json.decodeFromString<List<ProductInfo>>(raw) }
            .getOrElse { emptyList() }
    }
}
