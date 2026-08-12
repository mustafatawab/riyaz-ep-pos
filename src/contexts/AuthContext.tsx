import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("riyaz_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await api.auth.login(username, password);
      localStorage.setItem("riyaz_user", JSON.stringify(res.user));
      setUser(res.user);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Login failed";
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    localStorage.removeItem("riyaz_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
