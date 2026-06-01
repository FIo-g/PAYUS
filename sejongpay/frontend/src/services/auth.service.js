// src/services/auth.service.js
import api, { setTokens, clearTokens } from './api';

export const authService = {
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    setTokens(res.data.data.accessToken, res.data.data.refreshToken);
    return { data: res.data.data.user };
  },

  login: async (data) => {
    const res = await api.post('/auth/login', data);
    setTokens(res.data.data.accessToken, res.data.data.refreshToken);
    return { data: res.data.data.user };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearTokens();
    }
  },
};
