"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const authStatus = localStorage.getItem("digital-twin-auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("digital-twin-auth", "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("digital-twin-auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-200/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800 font-medium">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
