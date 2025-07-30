'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, adminPassword?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth data on mount
    const checkAuth = () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUserId = localStorage.getItem('user_id');
        const storedUserEmail = localStorage.getItem('user_email');


        if (storedToken && storedUserId && storedUserEmail) {
          setToken(storedToken);
          setUser({
            id: storedUserId,
            email: storedUserEmail,
          });
        }
      } catch (error) {
        // Silently handle auth check errors
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_id', data.user.id);
    localStorage.setItem('user_email', data.user.email);

    setToken(data.token);
    setUser(data.user);
    
    console.log('Login successful, user set:', data.user);
    
    // Use replace instead of push to avoid back button issues
    router.replace('/');
  };

  const register = async (email: string, password: string, adminPassword?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, adminPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_id', data.user.id);
    localStorage.setItem('user_email', data.user.email);

    setToken(data.token);
    setUser(data.user);
    
    console.log('Registration successful, user set:', data.user);
    
    // Use replace instead of push to avoid back button issues
    router.replace('/');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}