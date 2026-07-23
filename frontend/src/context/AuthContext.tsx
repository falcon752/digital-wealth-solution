'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<User | undefined>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem('dws_token', t);
    localStorage.setItem('dws_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dws_token');
    localStorage.removeItem('dws_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.user);
      localStorage.setItem('dws_user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch (err) {
      logout();
      throw err;
    }
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem('dws_token');
    const storedUser = localStorage.getItem('dws_user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        
        // If the stored user is pending onboarding fee, we block the UI until authAPI.me() finishes.
        // This prevents a stale cache from flashing the /pay-onboarding page if they were recently approved.
        const shouldBlockUI = parsedUser.role === 'user' && !parsedUser.onboardingFeePaid;

        if (!shouldBlockUI) {
          setIsLoading(false);
        }

        // Failsafe: never let the UI stay blocked forever even if the request below
        // hangs past its own timeout (e.g. an unexpected network/client edge case).
        const failsafe = shouldBlockUI ? setTimeout(() => setIsLoading(false), 20000) : null;

        // Background refresh to sync MongoDB payment/onboarding updates instantly
        authAPI.me()
          .then((res) => {
            setUser(res.data.user);
            localStorage.setItem('dws_user', JSON.stringify(res.data.user));
          })
          .catch(() => {
            // Token expired or invalid, log out
            localStorage.removeItem('dws_token');
            localStorage.removeItem('dws_user');
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            if (failsafe) clearTimeout(failsafe);
            if (shouldBlockUI) {
              setIsLoading(false);
            }
          });
      } catch {
        localStorage.removeItem('dws_token');
        localStorage.removeItem('dws_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
