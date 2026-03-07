package com.cartify.data.repository

import com.cartify.data.model.Product
import com.cartify.data.remote.backend.BackendProduct
import com.cartify.data.remote.backend.BackendConfig
import com.cartify.data.remote.backend.NetworkErrorMapper
import com.cartify.data.repository.BackendRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

sealed class ProductDataState {
    data object Loading : ProductDataState()
    data class Success(val products: List<Product>) : ProductDataState()
    data class Error(val message: String) : ProductDataState()
}

class ProductRepository(
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val backendRepository = BackendRepository()
    private var lastSuccessfulProducts: List<Product> = emptyList()
    private val repositoryScope = CoroutineScope(dispatcher)
    private var refreshJob: Job? = null

    private val _productsState = MutableStateFlow<ProductDataState>(ProductDataState.Loading)

    init {
        refreshProducts()
    }

    fun getProductsState(): StateFlow<ProductDataState> = _productsState.asStateFlow()

    fun refreshProducts() {
        refreshJob?.cancel()
        refreshJob = repositoryScope.launch {
            _productsState.value = ProductDataState.Loading
            runCatching { backendRepository.getProducts() }
                .onSuccess { products ->
                    val uiProducts = products.toUiProducts()
                    lastSuccessfulProducts = uiProducts
                    _productsState.value = ProductDataState.Success(uiProducts)
                }
                .onFailure { throwable ->
                    _productsState.value = if (lastSuccessfulProducts.isNotEmpty()) {
                        ProductDataState.Success(lastSuccessfulProducts)
                    } else {
                        ProductDataState.Error(
                            NetworkErrorMapper.toUserMessage(
                                throwable = throwable,
                                fallback = "Unable to load products"
                            )
                        )
                    }
                }
        }
    }

    suspend fun awaitInitialLoad(timeoutMs: Long = 12_000L): Boolean {
        if (_productsState.value !is ProductDataState.Loading) return true
        val loaded = withTimeoutOrNull(timeoutMs) {
            _productsState.first { it !is ProductDataState.Loading }
        }
        return loaded != null
    }
}

private fun List<BackendProduct>.toUiProducts(): List<Product> {
    val usedIds = mutableSetOf<Int>()
    return map { backendProduct ->
        backendProduct.toUiProduct(usedIds, sourceStoreSlug = null)
    }
}

fun List<BackendProduct>.toUiProductsForStore(storeSlug: String): List<Product> {
    val usedIds = mutableSetOf<Int>()
    return map { backendProduct ->
        backendProduct.toUiProduct(usedIds, sourceStoreSlug = storeSlug)
    }
}

private fun BackendProduct.toUiProduct(
    usedIds: MutableSet<Int>,
    sourceStoreSlug: String?
): Product {
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
        storeId = storeId?.trim().orEmpty(),
        storeSlug = storeSlug?.trim().orEmpty().ifBlank { sourceStoreSlug?.trim().orEmpty() },
        sizes = resolvedSizes(),
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

private fun BackendProduct.resolvedSizes(): List<String> {
    val directSizes = sizes.orEmpty()
        .map { it.trim() }
        .filter { it.isNotBlank() }

    val variantSizes = variants.orEmpty()
        .mapNotNull { it.size }
        .map { it.trim() }
        .filter { it.isNotBlank() }

    return (directSizes + variantSizes).distinct()
}
