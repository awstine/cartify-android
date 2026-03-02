package com.cartify.ui.screens.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductRepository

class ProductViewModelFactory(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProductViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ProductViewModel(productRepository, cartRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}