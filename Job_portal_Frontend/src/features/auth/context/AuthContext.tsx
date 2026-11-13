import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "../services/auth.service";
import { tokenStore } from "../tokenStore";
import type { AuthContextValue, LoginPayload, RegisterPayload, User } from "../types";

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const access = tokenStore.getAccess();
      if (!access) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const current = await authService.me();
        if (active) setUser(current);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    };
    const clearSession = () => {
      tokenStore.clear();
      setUser(null);
    };
    window.addEventListener("jobs-auth-expired", clearSession);
    void initialize();
    return () => {
      active = false;
      window.removeEventListener("jobs-auth-expired", clearSession);
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await authService.login(payload);
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    try {
      setUser(await authService.me());
    } catch (error) {
      tokenStore.clear();
      throw error;
    }
  }, []);

  const register = useCallback((payload: RegisterPayload) => authService.register(payload), []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const updateCurrentUser = useCallback((updated: User) => setUser(updated), []);

  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout, updateCurrentUser }), [user, isLoading, login, register, logout, updateCurrentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
