import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
        } catch {
          // Token invalid, clear it
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await authService.login({ email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const res = await authService.register(userData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await authService.updateProfile(data);
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || "Update failed";
      throw new Error(message);
    }
  }, []);

  const value = {
    user,
    setUser,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isAuthor: user?.role === "author" || user?.role === "admin",
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
