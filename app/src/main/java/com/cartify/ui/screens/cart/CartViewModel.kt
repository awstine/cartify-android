package com.cartify.ui.screens.cart

import androidx.lifecycle.ViewModel
import com.cartify.data.model.ProductInfo
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductRepository
import kotlinx.coroutines.flow.StateFlow

class CartViewModel(
    private val cartRepository: CartRepository,
) : ViewModel() {

    val cart: StateFlow<List<ProductInfo>> = cartRepository.cart

    fun clearCart() {
        cartRepository.clearCart()
    }

    fun increaseQuantity(productId: Int) {
        cartRepository.increaseQuantity(productId)
    }

    fun decreaseQuantity(productId: Int) {
        cartRepository.decreaseQuantity(productId)
    }
}
