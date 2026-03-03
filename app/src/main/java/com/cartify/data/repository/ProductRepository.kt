package com.cartify.data.repository

import com.cartify.data.model.Product
import com.cartify.data.remote.RetrofitInstance
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ProductDataState {
    data object Loading : ProductDataState()
    data class Success(val products: List<Product>) : ProductDataState()
    data class Error(val message: String) : ProductDataState()
}

class ProductRepository(
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val api = RetrofitInstance.api

    private val _productsState = MutableStateFlow<ProductDataState>(ProductDataState.Loading)

    init {
        refreshProducts()
    }

    fun getProductsState(): StateFlow<ProductDataState> = _productsState.asStateFlow()

    fun refreshProducts() {
        CoroutineScope(dispatcher).launch {
            _productsState.value = ProductDataState.Loading
            runCatching { api.getProducts() }
                .onSuccess { products ->
                    _productsState.value = ProductDataState.Success(products)
                }
                .onFailure { throwable ->
                    _productsState.value = ProductDataState.Error(
                        throwable.message ?: "Unable to load products"
                    )
                }
        }
    }
}
