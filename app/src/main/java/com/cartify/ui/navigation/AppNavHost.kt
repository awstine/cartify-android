package com.cartify.ui.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
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
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
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
    var wishlistProductIds by remember { mutableStateOf(setOf<String>()) }
    var prefetchingRoute by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        productViewModel.retryLoad()
    }

    LaunchedEffect(isLoggedIn, session.token) {
        val token = session.token?.trim().orEmpty()
        if (!isLoggedIn || token.isBlank()) {
            wishlistProductIds = emptySet()
            return@LaunchedEffect
        }

        runCatching {
            coroutineScope {
                val wishlistDeferred = async { backendRepository.getWishlist(token) }
                val ordersDeferred = async { backendRepository.getOrders(token) }
                val profileDeferred = async { backendRepository.getProfile(token) }
                val cartDeferred = async { backendRepository.getCart(token) }

                val wishlist = wishlistDeferred.await()
                wishlistProductIds = wishlist.items.map { it.productId }.toSet()

                runCatching { ordersDeferred.await() }
                runCatching { profileDeferred.await() }
                runCatching { cartDeferred.await() }
            }
        }
            .onFailure {
                runCatching { backendRepository.getWishlist(token) }
                    .onSuccess { wishlist ->
                        wishlistProductIds = wishlist.items.map { it.productId }.toSet()
                    }
            }
    }

    fun navigateWithPrefetch(route: String) {
        if (route == currentRoute || prefetchingRoute != null) return
        scope.launch {
            val token = session.token?.trim().orEmpty()
            val requiresPrefetch = route == NavigationItem.Wishlist.route ||
                route == NavigationItem.Cart.route ||
                route == NavigationItem.Orders.route ||
                route == NavigationItem.Profile.route

            if (isLoggedIn && token.isNotBlank() && requiresPrefetch) {
                prefetchingRoute = route
                runCatching { backendRepository.prefetchForRoute(token, route) }
            }

            navController.navigate(route) { launchSingleTop = true }
            prefetchingRoute = null
        }
    }

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
                    if (product.stock > 0) {
                        productViewModel.addToCart(product)
                        snackbarHostState.showSnackbar("Added to cart")
                    } else {
                        snackbarHostState.showSnackbar("Out of stock")
                    }
                }
                navController.navigate(action.returnRoute) { launchSingleTop = true }
            }
            "ADD_TO_WISHLIST" -> {
                val productId = action.payload?.productId
                val product = productId?.let { productViewModel.productById(it) }
                val backendId = product?.backendId?.trim().orEmpty()
                val token = session.token?.trim().orEmpty()

                if (backendId.isNotBlank() && token.isNotBlank()) {
                    runCatching { backendRepository.addToWishlist(token, backendId) }
                        .onSuccess {
                            wishlistProductIds = wishlistProductIds + backendId
                            snackbarHostState.showSnackbar("Added to wishlist")
                        }
                }
                navController.navigate(action.returnRoute) { launchSingleTop = true }
            }
            "OPEN_CART" -> navigateWithPrefetch(NavigationItem.Cart.route)
            "OPEN_CHECKOUT" -> navController.navigate("${NavigationItem.Checkout.route}?subtotal=0.0&shipping=0.0&tax=0.0&discount=0.0&total=0.0") { launchSingleTop = true }
            "OPEN_WISHLIST" -> navigateWithPrefetch(NavigationItem.Wishlist.route)
            "OPEN_PROFILE" -> navigateWithPrefetch(NavigationItem.Profile.route)
            "OPEN_ORDERS" -> navigateWithPrefetch(NavigationItem.Orders.route)
        }
        authViewModel.clearPendingAction()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            if (showMainShell) {
                TopAppBar(
                    modifier = Modifier.height(80.dp),
                    title = {
                        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Text(
                                text = "Cartify",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "Smart shopping",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    },
                    actions = {
                        IconButton(onClick = {
                            if (isLoggedIn) {
                                navigateWithPrefetch(NavigationItem.Profile.route)
                            } else {
                                navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                            }
                        }, modifier = Modifier
                            .padding(end = 2.dp)
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))) {
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
                                        .size(30.dp)
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
                                        .size(30.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.16f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = initials,
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                        IconButton(onClick = {
                            if (currentRoute != NavigationItem.Cart.route) {
                                navigateWithPrefetch(NavigationItem.Cart.route)
                            }
                        }, modifier = Modifier
                            .padding(end = 10.dp)
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))) {
                            if (cartItemCount > 0) {
                                BadgedBox(badge = { Badge { Text(cartItemCount.toString()) } }) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = "Cart",
                                        tint = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            } else {
                                Icon(
                                    Icons.Default.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                        titleContentColor = MaterialTheme.colorScheme.onSurface,
                        actionIconContentColor = MaterialTheme.colorScheme.onSurface
                    )
                )
            }
        },
        bottomBar = {
            if (showMainShell) {
                BottomNavigationBar(
                    navController = navController,
                    cartItemCount = cartItemCount,
                    onRouteSelected = { route -> navigateWithPrefetch(route) }
                )
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
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
                    onCartClick = { navigateWithPrefetch(NavigationItem.Cart.route) },
                    onAddToCartAttempt = { product ->
                        authViewModel.requireAuth(
                            actionName = "ADD_TO_CART",
                            returnRoute = "product_details/${product.id}",
                            payload = PendingActionPayload(productId = product.id, quantity = 1)
                        ) {
                            if (product.stock > 0) {
                                productViewModel.addToCart(product)
                                scope.launch { snackbarHostState.showSnackbar("Added to cart") }
                            } else {
                                scope.launch { snackbarHostState.showSnackbar("Out of stock") }
                            }
                        }
                    },
                    onSignInRequested = { navController.navigate(NavigationItem.Login.route) { launchSingleTop = true } },
                    onCreateAccountRequested = { navController.navigate(NavigationItem.SignUp.route) { launchSingleTop = true } }
                )
            }
            composable(NavigationItem.Categories.route) {
                CategoriesScreen(
                    categories = productViewModel.allCategories(),
                    onCategoryClick = { category ->
                        productViewModel.onCategorySelected(category)
                        navController.navigate(NavigationItem.Products.route) { launchSingleTop = true }
                    }
                )
            }
            composable(NavigationItem.Wishlist.route) {
                if (isLoggedIn) {
                    WishlistScreen(
                        token = session.token,
                        onProductClick = { backendProductId ->
                            productViewModel.productByBackendId(backendProductId)?.let { product ->
                                navController.navigate("product_details/${product.id}") { launchSingleTop = true }
                            }
                        },
                        onWishlistChanged = { ids -> wishlistProductIds = ids }
                    )
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
                            navigateWithPrefetch(NavigationItem.Orders.route)
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
                    isFavorite = selectedProduct?.backendId?.let { wishlistProductIds.contains(it) } == true,
                    onToggleFavorite = {
                        if (productId != null) {
                            val product = productViewModel.productById(productId)
                            val backendId = product?.backendId?.trim().orEmpty()
                            val allowed = authViewModel.requireAuth(
                                actionName = "ADD_TO_WISHLIST",
                                returnRoute = "product_details/$productId",
                                payload = PendingActionPayload(productId = productId)
                            ) {
                                val token = session.token?.trim().orEmpty()
                                if (backendId.isBlank() || token.isBlank()) {
                                    scope.launch { snackbarHostState.showSnackbar("Unable to update wishlist") }
                                } else {
                                    scope.launch {
                                        if (wishlistProductIds.contains(backendId)) {
                                            runCatching { backendRepository.removeWishlistItem(token, backendId) }
                                                .onSuccess {
                                                    wishlistProductIds = wishlistProductIds - backendId
                                                    snackbarHostState.showSnackbar("Removed from wishlist")
                                                }
                                                .onFailure {
                                                    snackbarHostState.showSnackbar(it.message ?: "Unable to update wishlist")
                                                }
                                        } else {
                                            runCatching { backendRepository.addToWishlist(token, backendId) }
                                                .onSuccess {
                                                    wishlistProductIds = wishlistProductIds + backendId
                                                    snackbarHostState.showSnackbar("Added to wishlist")
                                                }
                                                .onFailure {
                                                    snackbarHostState.showSnackbar(it.message ?: "Unable to update wishlist")
                                                }
                                        }
                                    }
                                }
                            }
                            if (!allowed) navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        }
                    },
                    onBack = { navController.popBackStack() },
                    onAddToCart = { product ->
                        if (product.stock <= 0) {
                            scope.launch { snackbarHostState.showSnackbar("Out of stock") }
                        } else {
                            val allowed = authViewModel.requireAuth(
                                actionName = "ADD_TO_CART",
                                returnRoute = "product_details/${product.id}",
                                payload = PendingActionPayload(productId = product.id, quantity = 1)
                            ) {
                                productViewModel.addToCart(product)
                                scope.launch { snackbarHostState.showSnackbar("Added to cart") }
                            }
                            if (!allowed) navController.navigate(NavigationItem.Login.route) { launchSingleTop = true }
                        }
                    },
                    onOrderNow = { product ->
                        if (product.stock <= 0) {
                            scope.launch { snackbarHostState.showSnackbar("Out of stock") }
                        } else {
                            val allowed = authViewModel.requireAuth(
                                actionName = "OPEN_CHECKOUT",
                                returnRoute = "product_details/${product.id}"
                            ) {
                                productViewModel.addToCart(product)
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
                        }
                    },
                    onSubmitReview = { product, stars ->
                        productViewModel.submitReview(product.id, stars)
                        scope.launch { snackbarHostState.showSnackbar("Review submitted") }
                    },
                    onRelatedProductClick = { relatedId ->
                        navController.navigate("product_details/$relatedId") {
                            launchSingleTop = true
                        }
                    }
                )
            }

            }

            if (!prefetchingRoute.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background.copy(alpha = 0.35f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
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
