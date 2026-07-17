import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, LoginResponse, APIError } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface MeResponse {
  user: Omit<User, 'password'>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync token-expiration/logout events from API client
  useEffect(() => {
    const handleLogoutEvent = () => {
      setCurrentUser(null);
      setAuthError(null);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  // Restore session on mount
  useEffect(() => {
    apiClient.get<{ success: boolean; data: MeResponse }>('/auth/me')
      .then(res => {
        setCurrentUser({ ...res.data.user, password: '' } as User);
      })
      .catch(err => {
        console.log('No active session found:', err.message);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string, role: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: { user: Omit<User, 'password'> } }>('/auth/login', {
        username,
        password,
        role
      });
      
      if (res && res.data && res.data.user) {
        setCurrentUser({ ...res.data.user, password: '' } as User);
        return true;
      }
      throw new Error('Authentication failed');
    } catch (err: any) {
      console.error('Login request failed:', err);
      const errMsg = err?.message || 'Invalid credentials or role mismatch';
      setAuthError(errMsg);
      throw new Error(errMsg);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.post('/auth/logout').catch(err => {
      console.error('Logout request failed:', err);
    });
    setCurrentUser(null);
    setAuthError(null);
  }, []);

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated: !!currentUser, authLoading, authError }}>
      {children}
    </AuthContext.Provider>
  );
};
