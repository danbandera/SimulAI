import { createContext, useContext, useState, useEffect } from "react";
import {
  loginRequest,
  verifyToken,
  resetPasswordRequest,
  resetPassword,
} from "../api/auth.api";

import { getSettings, updateSettings } from "../api/settings.api";

import Cookies from "js-cookie";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
  errors: string[] | null;
  loading: boolean;
  logout: () => void;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  resetPasswordRequest: (email: string) => Promise<void>;
  loadSettings: () => Promise<any>;
  updateSettings: (settings: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const checkLogin = async () => {
      try {
        const accessToken = Cookies.get("accessToken");

        if (!accessToken) {
          if (mounted) {
            setIsAuthenticated(false);
            setUser(null);
          }
          return;
        }

        const res = await verifyToken();
        if (mounted) {
          if (!res.data) {
            setIsAuthenticated(false);
            setUser(null);
          } else {
            setIsAuthenticated(true);
            setUser(res.data.data);
          }
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    checkLogin();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await loginRequest({ email, password });
      setUser(response);
      setIsAuthenticated(true);
      setErrors(null);
    } catch (error: any) {
      console.error("Login error:", error);
      setErrors(
        error.response?.data?.message || ["An error occurred during login"],
      );
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("user");
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  // Don't render children until authentication is initialized
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const resetPasswordFn = async (token: string, newPassword: string) => {
    try {
      const response = await resetPassword({ token, newPassword });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const loadSettings = async () => {
    try {
      const response = await getSettings();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateSettingsFn = async (settings: any) => {
    try {
      const response = await updateSettings(settings);
      return response;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        errors,
        loading,
        resetPassword: resetPasswordFn,
        resetPasswordRequest,
        loadSettings,
        updateSettings: updateSettingsFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
