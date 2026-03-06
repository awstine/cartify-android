package com.cartify.data.remote.backend

import java.io.IOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import retrofit2.HttpException

object NetworkErrorMapper {
    private const val NO_INTERNET_MESSAGE = "No internet connection. Check your connection and try again."
    private const val TIMEOUT_MESSAGE = "Request timed out. Please tap Retry."

    fun toUserMessage(
        throwable: Throwable,
        fallback: String,
        http401Message: String = "Invalid credentials",
        http409Message: String = "Email already in use",
        http422Message: String = "Please check your input"
    ): String {
        val http = throwable as? HttpException
        if (http != null) {
            return when (http.code()) {
                401 -> http401Message
                409 -> http409Message
                422 -> http422Message
                else -> fallback
            }
        }

        val root = rootCause(throwable)
        return when {
            root is SocketTimeoutException -> TIMEOUT_MESSAGE
            root is UnknownHostException -> NO_INTERNET_MESSAGE
            root is NoRouteToHostException -> NO_INTERNET_MESSAGE
            root is ConnectException -> NO_INTERNET_MESSAGE
            root is IOException && root.message?.contains("unable to resolve host", ignoreCase = true) == true -> NO_INTERNET_MESSAGE
            root is IOException && root.message?.contains("failed to connect", ignoreCase = true) == true -> NO_INTERNET_MESSAGE
            else -> throwable.message ?: fallback
        }
    }

    private fun rootCause(throwable: Throwable): Throwable {
        var current = throwable
        while (current.cause != null && current.cause !== current) {
            current = current.cause!!
        }
        return current
    }
}
