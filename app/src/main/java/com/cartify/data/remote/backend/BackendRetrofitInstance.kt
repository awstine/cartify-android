package com.cartify.data.remote.backend

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

object BackendRetrofitInstance {
    private val logger = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttp = OkHttpClient.Builder()
        .addInterceptor(logger)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val serviceCache = mutableMapOf<String, BackendApiService>()
    private val serviceMutex = Mutex()

    @Volatile
    private var activeBaseUrl: String = BackendConfig.candidateBaseUrls.first()

    suspend fun <T> call(block: suspend (BackendApiService) -> T): T {
        val candidates = buildList {
            add(activeBaseUrl)
            addAll(BackendConfig.candidateBaseUrls.filter { it != activeBaseUrl })
        }

        var lastError: Throwable? = null
        for (baseUrl in candidates) {
            val service = getService(baseUrl)
            try {
                val result = block(service)
                activeBaseUrl = baseUrl
                return result
            } catch (throwable: Throwable) {
                lastError = throwable
                if (!NetworkErrorMapper.isReachabilityFailure(throwable)) {
                    throw throwable
                }
            }
        }

        throw checkNotNull(lastError)
    }

    private suspend fun getService(baseUrl: String): BackendApiService {
        serviceCache[baseUrl]?.let { return it }
        return serviceMutex.withLock {
            serviceCache.getOrPut(baseUrl) {
                Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .client(okHttp)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
                    .create(BackendApiService::class.java)
            }
        }
    }
}
