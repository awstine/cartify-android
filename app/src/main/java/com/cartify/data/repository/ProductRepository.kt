package com.cartify.data.repository

import com.cartify.data.model.Product
import com.cartify.data.remote.backend.BackendProduct
import com.cartify.data.remote.backend.BackendConfig
import com.cartify.data.repository.BackendRepository
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
    private val backendRepository = BackendRepository()

    private val _productsState = MutableStateFlow<ProductDataState>(ProductDataState.Loading)

    init {
        refreshProducts()
    }

    fun getProductsState(): StateFlow<ProductDataState> = _productsState.asStateFlow()

    fun refreshProducts() {
        CoroutineScope(dispatcher).launch {
            _productsState.value = ProductDataState.Loading
            runCatching { backendRepository.getProducts() }
                .onSuccess { products ->
                    _productsState.value = ProductDataState.Success(products.toUiProducts())
                }
                .onFailure { throwable ->
                    _productsState.value = ProductDataState.Error(
                        throwable.message ?: "Unable to load products"
                    )
                }
        }
    }
}

private fun List<BackendProduct>.toUiProducts(): List<Product> {
    val usedIds = mutableSetOf<Int>()
    return map { backendProduct ->
        backendProduct.toUiProduct(usedIds)
    }
}

private fun BackendProduct.toUiProduct(usedIds: MutableSet<Int>): Product {
    val baseId = id.hashCode()
    var candidate = if (baseId == Int.MIN_VALUE) 0 else kotlin.math.abs(baseId)
    while (!usedIds.add(candidate)) {
        candidate += 1
    }
    val gallery = resolvedImageUrls()

    return Product(
        id = candidate,
        backendId = id,
        title = title,
        price = price,
        description = description,
        category = category.trim().ifBlank { "general" },
        imageUrl = gallery.firstOrNull().orEmpty(),
        imageUrls = gallery,
        stock = resolvedStock()
    )
}

private fun BackendProduct.resolvedStock(): Int {
    return listOf(stockQty, stock, quantity, countInStock)
        .firstOrNull { it != null && it >= 0 }
        ?: 0
}

private fun BackendProduct.resolvedImageUrls(): List<String> {
    val candidates = buildList {
        add(imageUrl.orEmpty())
        images.orEmpty().forEach { add(it) }
    }

    val backendHost = BackendConfig.baseUrl.removeSuffix("/api/").removeSuffix("/")
    return candidates
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .map { raw ->
            val compact = if (raw.startsWith("data:", ignoreCase = true)) {
                raw.replace("\\s".toRegex(), "")
            } else {
                raw
            }
            compact
                .replace("http://localhost:4000", backendHost, ignoreCase = true)
                .replace("http://127.0.0.1:4000", backendHost, ignoreCase = true)
                .replace("https://ecommerce-adroid-app.onrender.com", backendHost, ignoreCase = true)
        }
        .distinct()
}
