import { createContext, useContext, useMemo, useState } from "react";
import { DEFAULT_EMPLOYEE, DEMO_EMPLOYEES, EmployeeRole } from "@/lib/employees";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  city: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "authUser";

const DEMO_USER: AuthUser = DEFAULT_EMPLOYEE;
const AUTH_BYPASS_ENABLED = (import.meta.env.VITE_BYPASS_EMPLOYEE_LOGIN ?? "true") === "true";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredUser = () => {
  if (AUTH_BYPASS_ENABLED) {
    return DEMO_USER;
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = async (email: string, password: string) => {
    if (AUTH_BYPASS_ENABLED) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      return DEMO_USER;
    }

    const found = DEMO_EMPLOYEES.find((employee) => employee.email === email && employee.password === password);
    if (found) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      setUser(found);
      return found;
    }
    throw new Error("Неверный логин или пароль");
  };

  const logout = () => {
    if (AUTH_BYPASS_ENABLED) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
