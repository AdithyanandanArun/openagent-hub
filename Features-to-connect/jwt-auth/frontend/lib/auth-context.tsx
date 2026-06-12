'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AuthUser, getUser, getToken, isAuthenticated, clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  logout: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  function refreshUser() {
    if (isAuthenticated()) {
      setUser(getUser());
    } else {
      setUser(null);
      clearAuth();
    }
  }

  useEffect(() => {
    refreshUser();
    setIsLoading(false);
  }, []);

  function logout() {
    clearAuth();
    setUser(null);
    router.push('/auth/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
