package com.cartify.ui.screens.cart

import androidx.lifecycle.ViewModel
import com.cartify.data.model.ProductInfo
import com.cartify.data.repository.CartRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class CartViewModel(
    private val cartRepository: CartRepository,
) : ViewModel() {

    val cart: StateFlow<List<ProductInfo>> = cartRepository.cart
    private val _promoCode = MutableStateFlow("")
    val promoCode = _promoCode.asStateFlow()

    private val _discountPercent = MutableStateFlow(0.0)
    val discountPercent = _discountPercent.asStateFlow()

    fun clearCart() {
        cartRepository.clearCart()
    }

    fun increaseQuantity(productId: Int) {
        cartRepository.increaseQuantity(productId)
    }

    fun decreaseQuantity(productId: Int) {
        cartRepository.decreaseQuantity(productId)
    }

    fun removeItem(productId: Int) {
        cartRepository.removeItem(productId)
    }

    fun onPromoCodeChanged(value: String) {
        _promoCode.value = value
    }

    fun applyPromoCode() {
        _discountPercent.value = when (_promoCode.value.trim().uppercase()) {
            "SAVE10" -> 0.10
            "SAVE20" -> 0.20
            else -> 0.0
        }
    }
}
