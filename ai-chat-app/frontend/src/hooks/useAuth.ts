import { useCallback, useMemo, useState } from "react";
import * as authService from "../services/auth";
import type { AuthCredentials, AuthUser } from "../types/auth";

const TOKEN_KEY = "ai-chat-token";
const USER_KEY = "ai-chat-user";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const persist = useCallback((accessToken: string, email: string, userId: string) => {
    const nextUser = { email, userId };
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(accessToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await authService.login(credentials);
      persist(response.access_token, response.email, response.user_id);
    },
    [persist]
  );

  const register = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await authService.register(credentials);
      persist(response.access_token, response.email, response.user_id);
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, register, logout }),
    [token, user, login, register, logout]
  );
}
