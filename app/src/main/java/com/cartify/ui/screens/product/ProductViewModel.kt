package com.cartify.ui.screens.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cartify.data.model.Product
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductDataState
import com.cartify.data.repository.ProductRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
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
    private val query = MutableStateFlow("")
    private val category = MutableStateFlow("All")
    private val sort = MutableStateFlow(ProductSortOption.Popularity)
    private val likedProducts = MutableStateFlow<Set<Int>>(emptySet())
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
        sort
    ) { repositoryState, queryText, selectedCategory, selectedSort ->
        when (repositoryState) {
            is ProductDataState.Loading -> {
                ProductUiState(
                    isLoading = true,
                    searchQuery = queryText,
                    selectedCategory = selectedCategory,
                    selectedSort = selectedSort
                )
            }
            is ProductDataState.Error -> {
                ProductUiState(
                    isLoading = false,
                    error = repositoryState.message,
                    searchQuery = queryText,
                    selectedCategory = selectedCategory,
                    selectedSort = selectedSort
                )
            }
            is ProductDataState.Success -> {
                val filtered = repositoryState.products
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
            is ProductDataState.Success -> state.products.map { it.category }.distinct().sorted()
            else -> emptyList()
        }
        return listOf("All") + base
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
            state.products.find { it.id == productId }
        } else {
            null
        }
    }

    fun relatedProducts(product: Product, limit: Int = 10): List<Product> {
        val state = productRepository.getProductsState().value
        if (state !is ProductDataState.Success) return emptyList()

        val sameCategory = state.products
            .asSequence()
            .filter { it.id != product.id && it.category.equals(product.category, ignoreCase = true) }
            .toList()
        if (sameCategory.size >= limit) return sameCategory.take(limit)

        val additional = state.products
            .asSequence()
            .filter { it.id != product.id && sameCategory.none { existing -> existing.id == it.id } }
            .take(limit - sameCategory.size)
            .toList()
        return sameCategory + additional
    }

    fun isLiked(productId: Int): Boolean = likedProducts.value.contains(productId)

    fun toggleLike(productId: Int) {
        likedProducts.update { current ->
            if (current.contains(productId)) current - productId else current + productId
        }
    }

    private fun pseudoPopularity(id: Int): Int = (id * 37) % 100
}
