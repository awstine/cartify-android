package com.cartify.ui.screens.auth

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.cartify.data.repository.BackendRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import retrofit2.HttpException

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Success : AuthState()
    data class Error(val message: String) : AuthState()
}

@Serializable
data class PendingActionPayload(
    val productId: Int? = null,
    val quantity: Int = 1
)

@Serializable
data class PendingAuthAction(
    val actionName: String,
    val returnRoute: String,
    val payload: PendingActionPayload? = null
)

data class AuthSessionState(
    val isLoggedIn: Boolean = false,
    val userId: String? = null,
    val name: String? = null,
    val email: String? = null,
    val profileImageUrl: String? = null,
    val token: String? = null
)

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val backendRepository = BackendRepository()
    private val prefs = application.getSharedPreferences("auth_gate", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    private val pendingKey = "pending_action"
    private val tokenKey = "session_token"
    private val userIdKey = "session_user_id"
    private val userNameKey = "session_user_name"
    private val userEmailKey = "session_user_email"
    private val profileImageUrlKey = "session_profile_image_url"

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState = _authState.asStateFlow()

    private val _sessionState = MutableStateFlow(loadSession())
    val sessionState = _sessionState.asStateFlow()

    private val _pendingAction = MutableStateFlow(loadPendingAction())
    val pendingAction = _pendingAction.asStateFlow()

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _authState.value = AuthState.Error("Email and password cannot be empty")
            return
        }

        _authState.value = AuthState.Loading
        viewModelScope.launch {
            runCatching { backendRepository.login(email.trim(), pass) }
                .onSuccess { response ->
                    val session = AuthSessionState(
                        isLoggedIn = true,
                        userId = response.user.id,
                        name = response.user.name,
                        email = response.user.email,
                        profileImageUrl = response.user.profileImageUrl,
                        token = response.token
                    )
                    persistSession(session)
                    _sessionState.value = session
                    _authState.value = AuthState.Success
                }
                .onFailure { throwable ->
                    _authState.value = AuthState.Error(errorMessage(throwable, "Login failed"))
                }
        }
    }

    fun signUp(name: String, email: String, pass: String, confirmPass: String) {
        if (name.isBlank()) {
            _authState.value = AuthState.Error("Name cannot be empty")
            return
        }
        if (email.isBlank() || pass.isBlank()) {
            _authState.value = AuthState.Error("Email and password cannot be empty")
            return
        }
        if (pass != confirmPass) {
            _authState.value = AuthState.Error("Passwords do not match")
            return
        }

        _authState.value = AuthState.Loading
        viewModelScope.launch {
            runCatching { backendRepository.signUp(name.trim(), email.trim(), pass) }
                .onSuccess { response ->
                    val session = AuthSessionState(
                        isLoggedIn = true,
                        userId = response.user.id,
                        name = response.user.name,
                        email = response.user.email,
                        profileImageUrl = response.user.profileImageUrl,
                        token = response.token
                    )
                    persistSession(session)
                    _sessionState.value = session
                    _authState.value = AuthState.Success
                }
                .onFailure { throwable ->
                    _authState.value = AuthState.Error(errorMessage(throwable, "Sign up failed"))
                }
        }
    }

    fun signOut() {
        clearSession()
        _sessionState.value = AuthSessionState()
        _authState.value = AuthState.Idle
        clearPendingAction()
    }

    fun resetState() {
        _authState.value = AuthState.Idle
    }

    fun updateSessionProfile(name: String, email: String, profileImageUrl: String?) {
        val current = _sessionState.value
        val updated = current.copy(name = name, email = email, profileImageUrl = profileImageUrl)
        persistSession(updated)
        _sessionState.value = updated
    }

    fun requireAuth(
        actionName: String,
        returnRoute: String,
        payload: PendingActionPayload? = null,
        onSuccess: () -> Unit
    ): Boolean {
        return if (sessionState.value.isLoggedIn) {
            onSuccess()
            true
        } else {
            setPendingAction(PendingAuthAction(actionName, returnRoute, payload))
            false
        }
    }

    fun setPendingAction(action: PendingAuthAction) {
        _pendingAction.value = action
        prefs.edit().putString(pendingKey, json.encodeToString(PendingAuthAction.serializer(), action)).apply()
    }

    fun clearPendingAction() {
        _pendingAction.value = null
        prefs.edit().remove(pendingKey).apply()
    }

    private fun loadPendingAction(): PendingAuthAction? {
        val raw = prefs.getString(pendingKey, null) ?: return null
        return runCatching {
            json.decodeFromString(PendingAuthAction.serializer(), raw)
        }.getOrNull()
    }

    private fun loadSession(): AuthSessionState {
        val token = prefs.getString(tokenKey, null)
        val userId = prefs.getString(userIdKey, null)
        val name = prefs.getString(userNameKey, null)
        val email = prefs.getString(userEmailKey, null)
        val profileImageUrl = prefs.getString(profileImageUrlKey, null)
        return AuthSessionState(
            isLoggedIn = !token.isNullOrBlank(),
            userId = userId,
            name = name,
            email = email,
            profileImageUrl = profileImageUrl,
            token = token
        )
    }

    private fun persistSession(session: AuthSessionState) {
        prefs.edit()
            .putString(tokenKey, session.token)
            .putString(userIdKey, session.userId)
            .putString(userNameKey, session.name)
            .putString(userEmailKey, session.email)
            .putString(profileImageUrlKey, session.profileImageUrl)
            .apply()
    }

    private fun clearSession() {
        prefs.edit()
            .remove(tokenKey)
            .remove(userIdKey)
            .remove(userNameKey)
            .remove(userEmailKey)
            .remove(profileImageUrlKey)
            .apply()
    }

    private fun errorMessage(throwable: Throwable, fallback: String): String {
        val http = throwable as? HttpException
        if (http != null) {
            return when (http.code()) {
                401 -> "Invalid credentials"
                409 -> "Email already in use"
                422 -> "Please check your input"
                else -> fallback
            }
        }
        return throwable.message ?: fallback
    }
}

class AuthViewModelFactory(private val application: Application) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            return AuthViewModel(application) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
