package com.cartify.data.repository

import com.cartify.data.model.Product
import com.cartify.data.remote.RetrofitInstance
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProductRepository {
    private val api = RetrofitInstance.api

    private val _products = MutableStateFlow<List<Product>>(emptyList())

    init {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                _products.value = api.getProducts()
            } catch (e: Exception) {
                // In a real app, you'd want to handle this error more gracefully
                e.printStackTrace()
            }
        }
    }

    fun getProducts(): StateFlow<List<Product>> {
        return _products
    }
}