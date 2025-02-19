import { createContext, useContext, useState, useEffect } from "react";
import { loginRequest, verifyToken } from "../api/auth.api";
import Cookies from "js-cookie";

interface User {
  id: string;
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
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = Cookies.get("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!Cookies.get("accessToken");
  });

  const [errors, setErrors] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkLogin = async () => {
      const accessToken = Cookies.get("accessToken");

      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await verifyToken();
        if (!res.data) {
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(true);
          setUser(res.data);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, []);

  const login = async (email: string, password: string) => {
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
    }
  };

  const logout = () => {
    Cookies.remove("accessToken");
    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (errors) {
      const timeout = setTimeout(() => {
        setErrors(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [errors]);

  return (
    <AuthContext.Provider
      value={{ user, login, isAuthenticated, errors, loading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
