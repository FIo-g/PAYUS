// src/contexts/AuthContext.jsx
// 인증 상태 관리 — React Context API

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { getTokens, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  useEffect(() => {
    const init = async () => {
      const { accessToken } = getTokens();
      if (accessToken) {
        try {
          const res = await userService.getMe();
          setUser(res.data);
        } catch {
          clearTokens();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    setUser(res.data.user);
    return res;
  }, []);
  const register = useCallback(async (data) => {
    const res = await authService.register(data);
    setUser(res.data.user);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await userService.getMe();
    setUser(res.data);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isStudent: user?.role === 'student',
    isMerchant: user?.role === 'merchant',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
