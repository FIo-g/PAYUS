// src/services/api.js
// Axios 인스턴스 — 인증 헤더 자동 주입 + 401 자동 갱신

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 토큰 저장소 (Context 외부에서 접근하기 위한 간단한 저장소)
let tokenStore = {
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
};

export const setTokens = (accessToken, refreshToken) => {
  tokenStore = { accessToken, refreshToken };
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  else localStorage.removeItem('accessToken');
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  else localStorage.removeItem('refreshToken');
};

export const clearTokens = () => {
  tokenStore = { accessToken: null, refreshToken: null };
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getTokens = () => tokenStore;

// 요청 인터셉터 — Access Token 자동 주입
api.interceptors.request.use((config) => {
  const { accessToken } = tokenStore;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 응답 인터셉터 — 401 시 Refresh Token으로 자동 갱신
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: tokenStore.refreshToken,
        });
        setTokens(data.accessToken, tokenStore.refreshToken);
        return api(original); // 원래 요청 재시도
      } catch {
        clearTokens(); // Refresh도 만료 → 로그아웃
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
