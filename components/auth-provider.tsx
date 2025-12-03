"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, AuthUser } from "@/lib/api";

const buildAvatarUrl = (userData: AuthUser | null) => {
  if (!userData?.avatar) return undefined;
  if (userData.avatar.startsWith("http")) return userData.avatar;
  const id = (userData as any).id || userData.userId;
  if (!id) return undefined;
  return `https://cdn.discordapp.com/avatars/${id}/${userData.avatar}.png`;
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authApi.getMe();
        setUser({ ...userData, avatar: buildAvatarUrl(userData) });
        setError(null);
      } catch (err) {
        setUser(null);
        
        if (err instanceof Object && "status" in err && err.status !== 401) {
          setError((err as any).message || "Failed to fetch user");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = () => {
    authApi.login();
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      setError((err as any).message || "Failed to logout");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
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
