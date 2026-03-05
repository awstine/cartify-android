package com.cartify.ui.screens.checkout

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class CheckoutScreenTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun checkoutScreen_rendersSummaryAndButton() {
        composeTestRule.setContent {
            CheckoutScreen(
                subtotal = 10.0,
                shipping = 2.0,
                tax = 1.0,
                discount = 0.0,
                total = 13.0,
                isPlacingOrder = false,
                orderError = null,
                onProceedCheckout = {}
            )
        }

        composeTestRule.onNodeWithText("Checkout").assertIsDisplayed()
        composeTestRule.onNodeWithText("Order Summary").assertIsDisplayed()
        composeTestRule.onNodeWithText("Proceed to checkout").assertIsDisplayed()
    }
}
