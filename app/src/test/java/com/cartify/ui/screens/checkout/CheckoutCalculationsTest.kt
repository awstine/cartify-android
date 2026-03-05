package com.cartify.ui.screens.checkout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckoutCalculationsTest {

    @Test
    fun `dynamic shipping increases for express upcountry`() {
        val result = calculateDynamicShipping(baseShipping = 6.99, courier = "Express", zone = "Upcountry")
        assertTrue(result > 6.99)
    }

    @Test
    fun `pickup can reduce shipping`() {
        val result = calculateDynamicShipping(baseShipping = 6.99, courier = "Pickup", zone = "Urban")
        assertEquals(3.99, result, 0.01)
    }

    @Test
    fun `eta is immediate for pickup`() {
        val eta = estimateCheckoutEta(courier = "Pickup", zone = "Urban")
        assertEquals("Ready today for pickup", eta)
    }
}
