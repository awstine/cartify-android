package com.cartify.data.repository

import com.cartify.data.model.Cart
import com.cartify.data.model.Product
import com.cartify.data.model.ProductInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class CartRepository {

    private val _cart = MutableStateFlow<List<ProductInfo>>(emptyList())
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
    }

    fun clearCart() {
        _cart.value = emptyList()
    }

    fun increaseQuantity(productId: Int) {
        val currentCart = _cart.value.toMutableList()
        val existingProduct = currentCart.find { it.productId == productId }

        if (existingProduct != null) {
            val updatedProduct = existingProduct.copy(quantity = existingProduct.quantity + 1)
            val productIndex = currentCart.indexOf(existingProduct)
            currentCart[productIndex] = updatedProduct
            _cart.value = currentCart
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
        }
    }
}
