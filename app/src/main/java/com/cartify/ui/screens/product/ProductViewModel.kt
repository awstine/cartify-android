package com.cartify.ui.screens.product

import androidx.lifecycle.ViewModel
import com.cartify.data.model.Product
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductRepository
import kotlinx.coroutines.flow.StateFlow

class ProductViewModel(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository
) : ViewModel() {

    val products: StateFlow<List<Product>> = productRepository.getProducts()

    fun addToCart(product: Product) {
        cartRepository.addToCart(product)
    }
}
