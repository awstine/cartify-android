import axios from "axios";
import { startLoadingProgress } from "./loadingProgress";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://ecommerce-adroid-app.onrender.com/api";
const AUTH_STORAGE_KEY = "cartify_admin_auth";
const DEFAULT_PREFETCH_TTL_MS = 30_000;
const prefetchCache = new Map();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch (_err) {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const shouldTrackProgress = !config?.skipProgressBar;
  if (shouldTrackProgress) {
    config.__stopLoadingProgress = startLoadingProgress();
  }
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    response?.config?.__stopLoadingProgress?.();
    return response;
  },
  (error) => {
    error?.config?.__stopLoadingProgress?.();
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const normalizeParams = (params) => {
  if (!params || typeof params !== "object") return "";
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join("&");
};

const buildPrefetchKey = (url, params) => {
  const query = normalizeParams(params);
  return query ? `${url}?${query}` : url;
};

export const prefetchGet = async (url, { params, ttlMs = DEFAULT_PREFETCH_TTL_MS, force = false, withProgress = false } = {}) => {
  const key = buildPrefetchKey(url, params);
  const existing = prefetchCache.get(key);
  if (!force && existing && existing.expiresAt > Date.now()) {
    return existing.data;
  }

  const response = await api.get(url, { params, skipProgressBar: !withProgress });
  prefetchCache.set(key, {
    data: response.data,
    expiresAt: Date.now() + ttlMs,
  });
  return response.data;
};

export const consumePrefetchedGet = (url, { params } = {}) => {
  const key = buildPrefetchKey(url, params);
  const existing = prefetchCache.get(key);
  if (!existing) return null;
  if (existing.expiresAt <= Date.now()) {
    prefetchCache.delete(key);
    return null;
  }
  return existing.data;
};

export const clearPrefetchCache = (prefix = "") => {
  if (!prefix) {
    prefetchCache.clear();
    return;
  }
  [...prefetchCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) prefetchCache.delete(key);
  });
};
