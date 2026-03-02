package com.cartify.ui.navigation

import kotlinx.serialization.Serializable

@Serializable
sealed interface Screen{

    @Serializable
    data object Product : Screen

    @Serializable
    data object Cart: Screen

    @Serializable
    data object Checkout: Screen
}