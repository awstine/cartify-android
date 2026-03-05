import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "./api";

const AUTH_STORAGE_KEY = "cartify_admin_auth";
const AuthContext = createContext(null);
const STAFF_ROLES = ["merchant", "support", "manager", "admin", "super_admin"];

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
    setAuthState({
      token: payload.token,
      user: { ...payload.user, role: payload?.user?.role || "customer" },
    });
  };

  const signup = async ({ name, email, phoneNumber, password }) => {
    const response = await api.post("/auth/signup", { name, email, phoneNumber, password });
    const payload = response.data;
    setAuthToken(payload.token);
    setAuthState({
      token: payload.token,
      user: { ...payload.user, role: payload?.user?.role || "customer" },
    });
  };

  const signupMerchant = async ({ name, email, phoneNumber, password, storeName }) => {
    const payloadBody = { name, email, phoneNumber, password, storeName };
    let response;
    try {
      response = await api.post("/auth/signup-merchant", payloadBody);
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          response = await api.post("/auth/merchant-signup", payloadBody);
        } catch (fallbackErr) {
          if (fallbackErr?.response?.status === 404) {
            response = await api.post("/auth/signup/merchant", payloadBody);
          } else {
            throw fallbackErr;
          }
        }
      } else {
        throw err;
      }
    }
    const payload = response.data;
    setAuthToken(payload.token);
    setAuthState({
      token: payload.token,
      user: { ...payload.user, role: payload?.user?.role || "merchant" },
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
      isStaff: STAFF_ROLES.includes(authState?.user?.role),
      login,
      signup,
      signupMerchant,
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
