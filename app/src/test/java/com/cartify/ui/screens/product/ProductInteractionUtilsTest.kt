package com.cartify.ui.screens.product

import org.junit.Assert.assertEquals
import org.junit.Test

class ProductInteractionUtilsTest {

    @Test
    fun `swipe left moves to next category`() {
        val next = nextCategoryIndex(
            currentIndex = 1,
            lastIndex = 4,
            totalHorizontalDrag = -120f,
            thresholdPx = 80f
        )
        assertEquals(2, next)
    }

    @Test
    fun `swipe right moves to previous category`() {
        val next = nextCategoryIndex(
            currentIndex = 2,
            lastIndex = 4,
            totalHorizontalDrag = 120f,
            thresholdPx = 80f
        )
        assertEquals(1, next)
    }

    @Test
    fun `small drag keeps category unchanged`() {
        val next = nextCategoryIndex(
            currentIndex = 2,
            lastIndex = 4,
            totalHorizontalDrag = 20f,
            thresholdPx = 80f
        )
        assertEquals(2, next)
    }
}
