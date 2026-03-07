package com.cartify

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cartify.data.local.AppPreferences
import com.cartify.data.remote.backend.BackendStore
import com.cartify.data.repository.BackendRepository
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductRepository
import com.cartify.ui.navigation.AppNavHost
import com.cartify.ui.screens.cart.CartViewModel
import com.cartify.ui.screens.cart.CartViewModelFactory
import com.cartify.ui.screens.product.ProductViewModel
import com.cartify.ui.screens.product.ProductViewModelFactory
import com.cartify.ui.theme.CartifyTheme
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withTimeoutOrNull

class MainActivity : ComponentActivity() {

    private val appPreferences by lazy { AppPreferences(applicationContext) }
    private val cartRepository by lazy { CartRepository(applicationContext) }
    private val productRepository = ProductRepository()
    private val backendRepository = BackendRepository()

    private val cartViewModel: CartViewModel by viewModels {
        CartViewModelFactory(cartRepository)
    }

    private val productViewModel: ProductViewModel by viewModels {
        ProductViewModelFactory(productRepository, cartRepository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            var darkModeEnabled by remember { mutableStateOf(appPreferences.isDarkModeEnabled()) }
            var startupReady by remember { mutableStateOf(false) }
            var prefetchedStores by remember { mutableStateOf<List<BackendStore>>(emptyList()) }

            LaunchedEffect(Unit) {
                runCatching {
                    coroutineScope {
                        val productsDeferred = async { productRepository.awaitInitialLoad(timeoutMs = 8_000L) }
                        val storesDeferred = async {
                            withTimeoutOrNull(5_000L) {
                                runCatching { backendRepository.getStores() }
                            }
                        }
                        productsDeferred.await()
                        storesDeferred.await()?.getOrNull()?.let { prefetchedStores = it }
                    }
                }
                startupReady = true
            }

            CartifyTheme(darkTheme = darkModeEnabled) {
                if (startupReady) {
                    AppNavHost(
                        productViewModel = productViewModel,
                        cartViewModel = cartViewModel,
                        appPreferences = appPreferences,
                        prefetchedStores = prefetchedStores,
                        darkModeEnabled = darkModeEnabled,
                        onDarkModeChanged = { enabled ->
                            darkModeEnabled = enabled
                            appPreferences.setDarkModeEnabled(enabled)
                        }
                    )
                } else {
                    StartupPrefetchScreen()
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun StartupPrefetchScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            CircularProgressIndicator()
            Text(
                text = "Preparing app data...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
    }
}
