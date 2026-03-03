package com.cartify.data.local

import android.content.Context

class AppPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("cartify_prefs", Context.MODE_PRIVATE)

    fun isDarkModeEnabled(): Boolean = prefs.getBoolean(KEY_DARK_MODE, false)

    fun setDarkModeEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DARK_MODE, enabled).apply()
    }

    fun isNotificationsEnabled(): Boolean = prefs.getBoolean(KEY_NOTIFICATIONS, true)

    fun setNotificationsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_NOTIFICATIONS, enabled).apply()
    }

    companion object {
        private const val KEY_DARK_MODE = "dark_mode_enabled"
        private const val KEY_NOTIFICATIONS = "notifications_enabled"
    }
}
