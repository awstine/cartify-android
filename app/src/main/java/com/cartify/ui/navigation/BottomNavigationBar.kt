package com.cartify.ui.navigation

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState

@Composable
fun BottomNavigationBar(
    navController: NavController,
    cartItemCount: Int,
    onRouteSelected: (String) -> Unit = { route ->
        navController.navigate(route) { launchSingleTop = true }
    }
) {
    val items = listOf(
        NavigationItem.Products,
        NavigationItem.Categories,
        NavigationItem.Wishlist,
        NavigationItem.Cart,
        NavigationItem.Profile
    )
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 10.dp
    ) {
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStackEntry?.destination?.route
        items.forEach { item ->
            val selected = currentRoute == item.route || currentRoute?.startsWith("${item.route}/") == true
            val iconContent: @Composable () -> Unit = {
                if (item == NavigationItem.Cart && cartItemCount > 0) {
                    BadgedBox(
                        badge = {
                            Badge { Text(cartItemCount.toString()) }
                        }
                    ) {
                        Icon(item.icon, contentDescription = item.title, modifier = Modifier.size(20.dp))
                    }
                } else {
                    Icon(item.icon, contentDescription = item.title, modifier = Modifier.size(20.dp))
                }
            }
            NavigationBarItem(
                icon = iconContent,
                label = { Text(text = item.title, style = MaterialTheme.typography.labelSmall) },
                selected = selected,
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primary,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                ),
                onClick = {
                    onRouteSelected(item.route)
                }
            )
        }
    }
}

sealed class NavigationItem(var route: String, var icon: ImageVector, var title: String) {
    object Products : NavigationItem("products", Icons.Filled.Home, "Products")
    object Categories : NavigationItem("categories", Icons.Filled.GridView, "Categories")
    object Wishlist : NavigationItem("wishlist", Icons.Filled.Favorite, "Wishlist")
    object Cart : NavigationItem("cart", Icons.Filled.ShoppingCart, "Cart")
    object Profile : NavigationItem("profile", Icons.Filled.Person, "Profile")
    object Checkout : NavigationItem("checkout", Icons.Filled.CreditCard, "Checkout")
    object CheckoutSuccess : NavigationItem("checkout_success", Icons.Filled.Info, "Checkout Success")
    object Orders : NavigationItem("orders", Icons.Filled.Inventory2, "Orders")
    object Offers : NavigationItem("offers", Icons.Filled.LocalOffer, "Offers")
    object Settings : NavigationItem("settings", Icons.Filled.Settings, "Settings")
    object Help : NavigationItem("help", Icons.Filled.HelpOutline, "Help")
    object About : NavigationItem("about", Icons.Filled.Info, "About")
    object Login : NavigationItem("login", Icons.Filled.Tune, "Login")
    object SignUp : NavigationItem("signup", Icons.Filled.PersonAdd, "Sign Up")
    object AuthSuccess : NavigationItem("auth_success", Icons.Filled.Info, "Success")
    object Logout : NavigationItem("logout", Icons.Filled.Logout, "Logout")
}
