package com.cartify.ui.screens.product

fun nextCategoryIndex(
    currentIndex: Int,
    lastIndex: Int,
    totalHorizontalDrag: Float,
    thresholdPx: Float
): Int {
    if (currentIndex < 0 || lastIndex < 0) return currentIndex
    if (kotlin.math.abs(totalHorizontalDrag) < thresholdPx) return currentIndex
    return when {
        totalHorizontalDrag < 0 && currentIndex < lastIndex -> currentIndex + 1
        totalHorizontalDrag > 0 && currentIndex > 0 -> currentIndex - 1
        else -> currentIndex
    }
}
