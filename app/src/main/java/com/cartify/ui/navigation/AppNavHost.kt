package com.cartify.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.ui.unit.dp
import com.cartify.data.local.AppPreferences
import com.cartify.data.remote.backend.ClientCheckoutItem
import com.cartify.data.repository.BackendRepository
import com.cartify.ui.components.AppPrimaryButton
import com.cartify.ui.screens.auth.AuthSuccessScreen
import com.cartify.ui.screens.auth.AuthViewModel
import com.cartify.ui.screens.auth.AuthViewModelFactory
import com.cartify.ui.screens.auth.LoginScreen
import com.cartify.ui.screens.auth.PendingActionPayload
import com.cartify.ui.screens.auth.SignUpScreen
import com.cartify.ui.screens.cart.CartScreen
import com.cartify.ui.screens.cart.CartViewModel
import com.cartify.ui.screens.checkout.CheckoutSuccessScreen
import com.cartify.ui.screens.checkout.CheckoutScreen
import com.cartify.ui.screens.more.AboutScreen
import com.cartify.ui.screens.more.CategoriesScreen
import com.cartify.ui.screens.more.HelpScreen
import com.cartify.ui.screens.more.OffersScreen
import com.cartify.ui.screens.more.OrdersScreen
import com.cartify.ui.screens.more.ProfileScreen
import com.cartify.ui.screens.more.SettingsScreen
import com.cartify.ui.screens.more.WishlistScreen
import com.cartify.ui.screens.product.ProductDetailsScreen
import com.cartify.ui.screens.product.ProductScreen
import com.cartify.ui.screens.product.ProductViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavHost(
    productViewModel: ProductViewModel,
    cartViewModel: CartViewModel,
    appPreferences: AppPreferences,
    darkModeEnabled: Boolean,
    onDarkModeChanged: (Boolean) -> Unit
) {
    val app = LocalContext.current.applicationContext as android.app.Application
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val authViewModel: AuthViewModel = androidx.lifecycle.viewmodel.compose.viewModel(factory = AuthViewModelFactory(app))
    val session by authViewModel.sessionState.collectAsState()
    val pendingAction by authViewModel.pendingAction.collectAsState()
    val isLoggedIn = session.isLoggedIn
    val cartItems by cartViewModel.cart.collectAsState()
    val cartItemCount = cartItems.sumOf { it.quantity }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val backendRepository = remember { BackendRepository() }

    val mainRoutes = setOf(
        NavigationItem.Products.route,
        NavigationItem.Categories.route,
        NavigationItem.Wishlist.route,
        NavigationItem.Cart.route,
        NavigationItem.Profile.route,
        NavigationItem.Orders.route,
        NavigationItem.Offers.route,
        NavigationItem.Settings.route,
        NavigationItem.Help.route,
        NavigationItem.About.route,
        NavigationItem.Checkout.route,
        NavigationItem.CheckoutSuccess.route
    )
    val showMainShell = mainRoutes.any { route ->
        currentRoute == route ||
            currentRoute?.startsWith("$route?") == true ||
            currentRoute?.startsWith("$route/") == true
    }

    LaunchedEffect(isLoggedIn, pendingAction) {
        if (!isLoggedIn) return@LaunchedEffect
        val action = pendingAction ?: return@LaunchedEffect
        when (action.actionName) {
            "ADD_TO_CART" -> {
                val productId = action.payload?.productId
                val product = productId?.let { productViewModel.productById(it) }
                if (product != null) {
                    productViewModel.addToCart(product)
                    snackbarHostState.showSnackbar("Added to cart")
                }
                navController.navigate(action.returnRoute) { launchSingleTop = true }
            }
            "OPEN_CART" -> navController.navigate(NavigationItem.Cart.route) { launchSingleTop = true }
            "OPEN_CHECKOUT" -> navController.navigate("${NavigationItem.Checkout.route}?subtotal=0.0&shipping=0.0&tax=0.0&discount=0.0&total=0.0") { launchSingleTop = true }
            "OPEN_WISHLIST" -> navController.navigate(NavigationItem.Wishlist.route) { launchSingleTop = true }
            "OPEN_PROFILE" -> navController.navigate(NavigationItem.Profile.route) { launchSingleTop = true }
            "OPEN_ORDERS" -> navController.navigate(NavigationItem.Orders.route) { launchSingleTop = true }
        }
        authViewModel.clearPendingAction()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            if (showMainShell) {
                TopAppBar(
                    title = {
                        Text(
                            text = "Cartify",
                            style = MaterialTheme.typography.titleLarge
                        )
                    },
                    actions = {
                        IconButton(onClick = {
                            if (isLoggedIn) {
                                navController.navigate(NavigationItem.Profile.route) { launchSingleTop = true }
                            } else {
                                navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                            }
                        }) {
                            val avatarSource = session.profileImageUrl?.trim().orEmpty()
                            if (avatarSource.isNotBlank()) {
                                AsyncImage(
                                    model = ImageRequest.Builder(LocalContext.current)
                                        .data(avatarSource)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = "Profile",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                )
                            } else {
                                val initials = (session.name ?: "User")
                                    .trim()
                                    .ifBlank { "User" }
                                    .take(2)
                                    .uppercase()
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = initials,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                }
                            }
                        }
                        IconButton(onClick = {
                            if (currentRoute != NavigationItem.Cart.route) {
                                navController.navigate(NavigationItem.Cart.route) { launchSingleTop = true }
                            }
                        }) {
                            if (cartItemCount > 0) {
                                BadgedBox(badge = { Badge { Text(cartItemCount.toString()) } }) {
                                    Icon(Icons.Default.ShoppingCart, contentDescription = "Cart")
                                }
                            } else {
                                Icon(Icons.Default.ShoppingCart, contentDescription = "Cart")
                            }
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        titleContentColor = MaterialTheme.colorScheme.onPrimary,
                        actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        },
        bottomBar = {
            if (showMainShell) {
                BottomNavigationBar(navController, cartItemCount)
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = NavigationItem.Products.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(NavigationItem.Login.route) {
                LoginScreen(
                    viewModel = authViewModel,
                    onLoginSuccess = {
                        if (pendingAction == null) {
                            navController.navigate(NavigationItem.Products.route) {
                                popUpTo(NavigationItem.Login.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    },
                    onSignUpClicked = { navController.navigate(NavigationItem.SignUp.route) },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(NavigationItem.SignUp.route) {
                SignUpScreen(
                    viewModel = authViewModel,
                    onSignUpSuccess = {
                        if (pendingAction == null) {
                            navController.navigate(NavigationItem.AuthSuccess.route) {
                                popUpTo(NavigationItem.SignUp.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    },
                    onLoginClicked = { navController.navigate(NavigationItem.Login.route) },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(NavigationItem.AuthSuccess.route) {
                AuthSuccessScreen(
                    onBrowseHome = {
                        navController.navigate(NavigationItem.Products.route) {
                            popUpTo(NavigationItem.AuthSuccess.route) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                )
            }
            composable(NavigationItem.Products.route) {
                ProductScreen(
                    viewModel = productViewModel,
                    onProductClick = { productId -> navController.navigate("product_details/$productId") },
                    onCartClick = { navController.navigate(NavigationItem.Cart.route) { launchSingleTop = true } },
                    onAddToCartAttempt = { product ->
                        authViewModel.requireAuth(
                            actionName = "ADD_TO_CART",
                            returnRoute = "product_details/${product.id}",
                            payload = PendingActionPayload(productId = product.id, quantity = 1)
                        ) {
                            productViewModel.addToCart(product)
                            scope.launch { snackbarHostState.showSnackbar("Added to cart") }
                        }
                    },
                    onSignInRequested = { navController.navigate(NavigationItem.Login.route) { launchSingleTop = true } },
                    onCreateAccountRequested = { navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true } }
                )
            }
            composable(NavigationItem.Categories.route) {
                CategoriesScreen(
                    onCategoryClick = { category ->
                        productViewModel.onCategorySelected(category)
                        navController.navigate(NavigationItem.Products.route) { launchSingleTop = true }
                    }
                )
            }
            composable(NavigationItem.Wishlist.route) {
                if (isLoggedIn) {
                    WishlistScreen()
                } else {
                    AuthRequiredScreen(
                        title = "Sign in to continue",
                        message = "Create an account or sign in to save your wishlist.",
                        onSignIn = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_WISHLIST",
                                    returnRoute = NavigationItem.Wishlist.route
                                )
                            )
                            navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        },
                        onSignUp = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_WISHLIST",
                                    returnRoute = NavigationItem.Wishlist.route
                                )
                            )
                            navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true }
                        },
                        onContinue = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                }
            }
            composable(NavigationItem.Cart.route) {
                if (isLoggedIn) {
                    CartScreen(
                        navController = navController,
                        cartViewModel = cartViewModel,
                        productViewModel = productViewModel,
                        onProductClick = { productId ->
                            navController.navigate("product_details/$productId") {
                                launchSingleTop = true
                            }
                        }
                    )
                } else {
                    AuthRequiredScreen(
                        title = "Sign in to view your cart",
                        message = "Create an account or sign in to add items to your cart and checkout faster.",
                        onSignIn = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_CART",
                                    returnRoute = NavigationItem.Cart.route
                                )
                            )
                            navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        },
                        onSignUp = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_CART",
                                    returnRoute = NavigationItem.Cart.route
                                )
                            )
                            navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true }
                        },
                        onContinue = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                }
            }
            composable(NavigationItem.Profile.route) {
                if (isLoggedIn) {
                    ProfileScreen(
                        displayName = session.name,
                        email = session.email,
                        profileImageUrl = session.profileImageUrl,
                        token = session.token,
                        initialNotificationsEnabled = appPreferences.isNotificationsEnabled(),
                        initialDarkModeEnabled = darkModeEnabled,
                        onNotificationsChanged = { enabled -> appPreferences.setNotificationsEnabled(enabled) },
                        onDarkModeChanged = onDarkModeChanged,
                        onProfileUpdated = { updated ->
                            authViewModel.updateSessionProfile(
                                name = updated.name,
                                email = updated.email,
                                profileImageUrl = updated.profileImageUrl
                            )
                            scope.launch { snackbarHostState.showSnackbar("Profile updated") }
                        },
                        onAccountDeleted = {
                            authViewModel.signOut()
                            navController.navigate(NavigationItem.Products.route) {
                                popUpTo(navController.graph.id) { inclusive = true }
                                launchSingleTop = true
                            }
                            scope.launch { snackbarHostState.showSnackbar("Account deleted") }
                        },
                        onOpenOrders = {
                            navController.navigate(NavigationItem.Orders.route) {
                                launchSingleTop = true
                            }
                        },
                        onLogout = {
                            authViewModel.signOut()
                            navController.navigate(NavigationItem.Products.route) {
                                popUpTo(navController.graph.id) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                } else {
                    AuthRequiredScreen(
                        title = "Sign in to view your profile",
                        message = "Create an account or sign in to access profile and account settings.",
                        onSignIn = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_PROFILE",
                                    returnRoute = NavigationItem.Profile.route
                                )
                            )
                            navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        },
                        onSignUp = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_PROFILE",
                                    returnRoute = NavigationItem.Profile.route
                                )
                            )
                            navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true }
                        },
                        onContinue = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                }
            }
            composable(NavigationItem.Orders.route) {
                if (isLoggedIn) {
                    OrdersScreen(token = session.token)
                } else {
                    AuthRequiredScreen(
                        title = "Sign in to view orders",
                        message = "Create an account or sign in to access your order history.",
                        onSignIn = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_ORDERS",
                                    returnRoute = NavigationItem.Orders.route
                                )
                            )
                            navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        },
                        onSignUp = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_ORDERS",
                                    returnRoute = NavigationItem.Orders.route
                                )
                            )
                            navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true }
                        },
                        onContinue = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                }
            }
            composable(NavigationItem.Offers.route) { OffersScreen() }
            composable(NavigationItem.Settings.route) { SettingsScreen() }
            composable(NavigationItem.Help.route) { HelpScreen() }
            composable(NavigationItem.About.route) { AboutScreen() }
            composable(
                route = "${NavigationItem.Checkout.route}?subtotal={subtotal}&shipping={shipping}&tax={tax}&discount={discount}&total={total}",
                arguments = listOf(
                    navArgument("subtotal") { type = NavType.FloatType; defaultValue = 0f },
                    navArgument("shipping") { type = NavType.FloatType; defaultValue = 0f },
                    navArgument("tax") { type = NavType.FloatType; defaultValue = 0f },
                    navArgument("discount") { type = NavType.FloatType; defaultValue = 0f },
                    navArgument("total") { type = NavType.FloatType; defaultValue = 0f }
                )
            ) { backStackEntry ->
                val subtotal = backStackEntry.arguments?.getFloat("subtotal")?.toDouble() ?: 0.0
                val shipping = backStackEntry.arguments?.getFloat("shipping")?.toDouble() ?: 0.0
                val tax = backStackEntry.arguments?.getFloat("tax")?.toDouble() ?: 0.0
                val discount = backStackEntry.arguments?.getFloat("discount")?.toDouble() ?: 0.0
                val total = backStackEntry.arguments?.getFloat("total")?.toDouble() ?: 0.0
                var isPlacingOrder by remember { mutableStateOf(false) }
                var checkoutError by remember { mutableStateOf<String?>(null) }
                if (isLoggedIn) {
                    CheckoutScreen(
                        subtotal = subtotal,
                        shipping = shipping,
                        tax = tax,
                        discount = discount,
                        total = total,
                        isPlacingOrder = isPlacingOrder,
                        orderError = checkoutError,
                        onProceedCheckout = {
                            val token = session.token
                            if (token.isNullOrBlank()) {
                                checkoutError = "Session expired. Please sign in again."
                            } else {
                                val checkoutItems = cartItems.mapNotNull { cartItem ->
                                    productViewModel.productById(cartItem.productId)?.let { product ->
                                        ClientCheckoutItem(
                                            title = product.title,
                                            imageUrl = product.imageUrl,
                                            price = product.price,
                                            quantity = cartItem.quantity
                                        )
                                    }
                                }

                                if (checkoutItems.isEmpty()) {
                                    checkoutError = "Your cart is empty."
                                } else {
                                    isPlacingOrder = true
                                    checkoutError = null
                                    scope.launch {
                                        runCatching { backendRepository.checkoutFromClient(token, checkoutItems) }
                                            .onSuccess {
                                                cartViewModel.clearCart()
                                                navController.navigate(NavigationItem.CheckoutSuccess.route) {
                                                    launchSingleTop = true
                                                }
                                            }
                                            .onFailure {
                                                checkoutError = it.message ?: "Unable to place order"
                                            }
                                        isPlacingOrder = false
                                    }
                                }
                            }
                        }
                    )
                } else {
                    AuthRequiredScreen(
                        title = "Sign in to continue",
                        message = "Create an account or sign in to continue to checkout.",
                        onSignIn = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_CHECKOUT",
                                    returnRoute = NavigationItem.Checkout.route
                                )
                            )
                            navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        },
                        onSignUp = {
                            authViewModel.setPendingAction(
                                com.cartify.ui.screens.auth.PendingAuthAction(
                                    actionName = "OPEN_CHECKOUT",
                                    returnRoute = NavigationItem.Checkout.route
                                )
                            )
                            navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true }
                        },
                        onContinue = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                }
            }
            composable(NavigationItem.CheckoutSuccess.route) {
                if (isLoggedIn) {
                    CheckoutSuccessScreen(
                        onContinueShopping = { navController.navigate(NavigationItem.Products.route) { launchSingleTop = true } }
                    )
                } else {
                    navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                }
            }
            composable(
                route = "product_details/{productId}",
                arguments = listOf(navArgument("productId") { type = NavType.IntType })
            ) { backStackEntry ->
                val productId = backStackEntry.arguments?.getInt("productId")
                val selectedProduct = productId?.let { productViewModel.productById(it) }
                ProductDetailsScreen(
                    product = selectedProduct,
                    relatedProducts = selectedProduct?.let { productViewModel.relatedProducts(it, limit = 10) } ?: emptyList(),
                    isFavorite = productId?.let { productViewModel.isLiked(it) } == true,
                    onToggleFavorite = {
                        if (productId != null) {
                            val allowed = authViewModel.requireAuth(
                                actionName = "OPEN_WISHLIST",
                                returnRoute = "product_details/$productId"
                            ) {
                                productViewModel.toggleLike(productId)
                            }
                            if (!allowed) navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        }
                    },
                    onBack = { navController.popBackStack() },
                    onAddToCart = { product ->
                        val allowed = authViewModel.requireAuth(
                            actionName = "ADD_TO_CART",
                            returnRoute = "product_details/${product.id}",
                            payload = PendingActionPayload(productId = product.id, quantity = 1)
                        ) {
                            productViewModel.addToCart(product)
                            scope.launch { snackbarHostState.showSnackbar("Added to cart") }
                        }
                        if (!allowed) navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                    },
                    onOrderNow = { product ->
                        val allowed = authViewModel.requireAuth(
                            actionName = "OPEN_CHECKOUT",
                            returnRoute = "product_details/${product.id}"
                        ) {
                            val subtotal = product.price
                            val shipping = if (subtotal > 0) 6.99 else 0.0
                            val tax = subtotal * 0.08
                            val discount = 0.0
                            val total = subtotal + shipping + tax - discount
                            navController.navigate(
                                "${NavigationItem.Checkout.route}?subtotal=$subtotal&shipping=$shipping&tax=$tax&discount=$discount&total=$total"
                            ) {
                                launchSingleTop = true
                            }
                        }
                        if (!allowed) navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                    },
                    onRelatedProductClick = { relatedId ->
                        navController.navigate("product_details/$relatedId") {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun AuthRequiredScreen(
    title: String,
    message: String,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onContinue: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)
        )
        AppPrimaryButton(
            text = "Sign in",
            onClick = onSignIn,
            modifier = Modifier.fillMaxWidth()
        )
        TextButton(onClick = onSignUp, modifier = Modifier.fillMaxWidth()) { Text("Create account") }
        TextButton(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue browsing") }
    }
}
