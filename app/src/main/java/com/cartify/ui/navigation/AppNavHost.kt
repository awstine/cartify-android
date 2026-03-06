package com.cartify.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cartify.ui.screens.auth.AuthViewModel
import com.cartify.ui.screens.auth.LoginScreen
import com.cartify.ui.screens.auth.SignUpScreen
import com.cartify.ui.screens.cart.CartScreen
import com.cartify.ui.screens.cart.CartViewModel
import com.cartify.ui.screens.checkout.CheckoutScreen
import com.cartify.ui.screens.product.ProductScreen
import com.cartify.ui.screens.product.ProductViewModel

@Composable
fun AppNavHost(
    productViewModel: ProductViewModel,
    cartViewModel: CartViewModel
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val authViewModel: AuthViewModel = viewModel()

    Scaffold(
        bottomBar = {
            if (currentRoute == NavigationItem.Products.route || currentRoute == NavigationItem.Cart.route) {
                BottomNavigationBar(navController)
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = NavigationItem.Login.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(NavigationItem.Login.route) {
                LoginScreen(
                    viewModel = authViewModel,
                    onLoginSuccess = { navController.navigate(NavigationItem.Products.route) },
                    onSignUpClicked = { navController.navigate(NavigationItem.SignUp.route) }
                )
            }
            composable(NavigationItem.SignUp.route) {
                SignUpScreen(
                    viewModel = authViewModel,
                    onSignUpSuccess = {
                        navController.navigate(NavigationItem.Products.route)
                    },
                    onLoginClicked = {
                        navController.navigate(NavigationItem.Login.route)
                    }
                )
            }
            composable(NavigationItem.Products.route) {
                ProductScreen(productViewModel)
            }
            composable(NavigationItem.Cart.route) {
                CartScreen(navController, cartViewModel, productViewModel)
            }
            composable(NavigationItem.Checkout.route) {
                CheckoutScreen(
                    onContinueShopping = { navController.navigate(NavigationItem.Products.route) },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}