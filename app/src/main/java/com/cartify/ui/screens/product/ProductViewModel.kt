package com.cartify.ui.screens.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cartify.data.model.Product
import com.cartify.data.model.ProductRating
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductDataState
import com.cartify.data.repository.ProductRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted

enum class ProductSortOption { Popularity, Newest, PriceLowToHigh, PriceHighToLow }

data class ProductUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val products: List<Product> = emptyList(),
    val searchQuery: String = "",
    val selectedCategory: String = "All",
    val selectedSort: ProductSortOption = ProductSortOption.Popularity
)

class ProductViewModel(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository
) : ViewModel() {
    private var lastVisibleProducts: List<Product> = emptyList()
    private val query = MutableStateFlow("")
    private val category = MutableStateFlow("All")
    private val sort = MutableStateFlow(ProductSortOption.Popularity)
    private val localReviews = MutableStateFlow<Map<Int, List<Int>>>(emptyMap())
    val cartItemCount: StateFlow<Int> = cartRepository.cart
        .map { items -> items.sumOf { it.quantity } }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = 0
        )

    val uiState: StateFlow<ProductUiState> = combine(
        productRepository.getProductsState(),
        query,
        category,
        sort,
        localReviews
    ) { repositoryState, queryText, selectedCategory, selectedSort, reviews ->
        when (repositoryState) {
            is ProductDataState.Loading -> {
                ProductUiState(
                    isLoading = true,
                    products = lastVisibleProducts,
                    searchQuery = queryText,
                    selectedCategory = selectedCategory,
                    selectedSort = selectedSort
                )
            }
            is ProductDataState.Error -> {
                ProductUiState(
                    isLoading = false,
                    error = repositoryState.message,
                    products = lastVisibleProducts,
                    searchQuery = queryText,
                    selectedCategory = selectedCategory,
                    selectedSort = selectedSort
                )
            }
            is ProductDataState.Success -> {
                val filtered = repositoryState.products
                    .map { applyLocalReviews(it, reviews[it.id].orEmpty()) }
                    .filter { selectedCategory == "All" || it.category.equals(selectedCategory, true) }
                    .filter {
                        queryText.isBlank() ||
                            it.title.contains(queryText, ignoreCase = true) ||
                            it.description.contains(queryText, ignoreCase = true)
                    }
                    .let { items ->
                        when (selectedSort) {
                            ProductSortOption.Popularity -> items.sortedByDescending { pseudoPopularity(it.id) }
                            ProductSortOption.Newest -> items.sortedByDescending { it.id }
                            ProductSortOption.PriceLowToHigh -> items.sortedBy { it.price }
                            ProductSortOption.PriceHighToLow -> items.sortedByDescending { it.price }
                        }
                    }

                lastVisibleProducts = filtered
                ProductUiState(
                    isLoading = false,
                    products = filtered,
                    searchQuery = queryText,
                    selectedCategory = selectedCategory,
                    selectedSort = selectedSort
                )
            }
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = ProductUiState()
    )

    fun allCategories(): List<String> {
        val base = when (val state = productRepository.getProductsState().value) {
            is ProductDataState.Success -> state.products
                .map { it.category.trim() }
                .filter { it.isNotBlank() }
                .distinctBy { it.lowercase() }
                .sortedBy { it.lowercase() }
            else -> emptyList()
        }
        return listOf("All") + base
    }

    fun categoryImageMap(): Map<String, String> {
        val state = productRepository.getProductsState().value
        if (state !is ProductDataState.Success) return emptyMap()
        return state.products
            .asSequence()
            .filter { it.category.isNotBlank() }
            .groupBy { it.category.trim().lowercase() }
            .mapValues { (_, products) ->
                products
                    .asSequence()
                    .flatMap { p -> (p.imageUrls + listOf(p.imageUrl)).asSequence() }
                    .map { it.trim() }
                    .firstOrNull { it.isNotBlank() }
                    .orEmpty()
            }
    }

    fun addToCart(product: Product) {
        cartRepository.addToCart(product)
    }

    fun onSearchQueryChanged(value: String) {
        query.value = value
    }

    fun onCategorySelected(value: String) {
        category.value = value
    }

    fun onSortSelected(value: ProductSortOption) {
        sort.value = value
    }

    fun retryLoad() {
        productRepository.refreshProducts()
    }

    fun productById(productId: Int): Product? {
        val state = productRepository.getProductsState().value
        return if (state is ProductDataState.Success) {
            state.products
                .map { applyLocalReviews(it, localReviews.value[it.id].orEmpty()) }
                .find { it.id == productId }
        } else {
            null
        }
    }

    fun productByBackendId(backendId: String): Product? {
        val state = productRepository.getProductsState().value
        return if (state is ProductDataState.Success) {
            state.products
                .map { applyLocalReviews(it, localReviews.value[it.id].orEmpty()) }
                .find { it.backendId == backendId }
        } else {
            null
        }
    }

    fun relatedProducts(product: Product, limit: Int = 10): List<Product> {
        val state = productRepository.getProductsState().value
        if (state !is ProductDataState.Success) return emptyList()

        val hydrated = state.products.map { applyLocalReviews(it, localReviews.value[it.id].orEmpty()) }
        val sameCategory = hydrated
            .asSequence()
            .filter { it.id != product.id && it.category.equals(product.category, ignoreCase = true) }
            .toList()
        if (sameCategory.size >= limit) return sameCategory.take(limit)

        val additional = hydrated
            .asSequence()
            .filter { it.id != product.id && sameCategory.none { existing -> existing.id == it.id } }
            .take(limit - sameCategory.size)
            .toList()
        return sameCategory + additional
    }

    fun submitReview(productId: Int, stars: Int) {
        val normalized = stars.coerceIn(1, 5)
        val current = localReviews.value[productId].orEmpty()
        localReviews.value = localReviews.value + (productId to (current + normalized))
    }

    private fun pseudoPopularity(id: Int): Int = (id * 37) % 100

    private fun applyLocalReviews(product: Product, reviews: List<Int>): Product {
        if (reviews.isEmpty()) return product
        val baseCount = product.rating?.count ?: 0
        val baseTotal = (product.rating?.rate ?: 0.0) * baseCount
        val reviewCount = reviews.size
        val reviewTotal = reviews.sum()
        val totalCount = baseCount + reviewCount
        if (totalCount <= 0) return product
        val totalRate = (baseTotal + reviewTotal) / totalCount.toDouble()
        return product.copy(
            rating = ProductRating(
                rate = totalRate.coerceIn(0.0, 5.0),
                count = totalCount
            )
        )
    }
}
