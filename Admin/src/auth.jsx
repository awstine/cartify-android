import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "./api";

const AUTH_STORAGE_KEY = "cartify_admin_auth";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { token: null, user: null };
    } catch (_err) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return { token: null, user: null };
    }
  });

  useEffect(() => {
    setAuthToken(authState.token);
    if (authState.token) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authState]);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const payload = response.data;
    setAuthToken(payload.token);
    try {
      await api.get("/admin/dashboard");
    } catch (_err) {
      setAuthToken(null);
      throw new Error("This account is not an admin.");
    }
    setAuthState({
      token: payload.token,
      user: { ...payload.user, role: payload?.user?.role || "admin" },
    });
  };

  const logout = () => {
    setAuthState({ token: null, user: null });
  };

  const updateUser = (nextUser) => {
    setAuthState((prev) => ({
      ...prev,
      user: { ...(prev.user || {}), ...(nextUser || {}) },
    }));
  };

  const value = useMemo(
    () => ({
      token: authState.token,
      user: authState.user,
      isAuthenticated: Boolean(authState.token && authState.user),
      login,
      logout,
      updateUser,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
