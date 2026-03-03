package com.cartify

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.cartify.data.local.AppPreferences
import com.cartify.data.repository.CartRepository
import com.cartify.data.repository.ProductRepository
import com.cartify.ui.navigation.AppNavHost
import com.cartify.ui.screens.cart.CartViewModel
import com.cartify.ui.screens.cart.CartViewModelFactory
import com.cartify.ui.screens.product.ProductViewModel
import com.cartify.ui.screens.product.ProductViewModelFactory
import com.cartify.ui.theme.CartifyTheme

class MainActivity : ComponentActivity() {

    private val appPreferences by lazy { AppPreferences(applicationContext) }
    private val cartRepository by lazy { CartRepository(applicationContext) }
    private val productRepository = ProductRepository()

    private val cartViewModel: CartViewModel by viewModels {
        CartViewModelFactory(cartRepository)
    }

    private val productViewModel: ProductViewModel by viewModels {
        ProductViewModelFactory(productRepository, cartRepository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent{
            var darkModeEnabled by remember { mutableStateOf(appPreferences.isDarkModeEnabled()) }

            CartifyTheme(darkTheme = darkModeEnabled) {
                AppNavHost(
                    productViewModel = productViewModel,
                    cartViewModel = cartViewModel,
                    appPreferences = appPreferences,
                    darkModeEnabled = darkModeEnabled,
                    onDarkModeChanged = { enabled ->
                        darkModeEnabled = enabled
                        appPreferences.setDarkModeEnabled(enabled)
                    }
                )
            }
        }
    }
}
