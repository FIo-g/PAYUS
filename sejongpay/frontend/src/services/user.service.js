// src/services/user.service.js
import api from './api';

export const userService = {
  getMe: () => api.get('/users/me').then((r) => r.data),
  updateMe: (data) => api.put('/users/me', data).then((r) => r.data),
  getWallet: () => api.get('/users/me/wallet').then((r) => r.data),
  chargeWallet: (amount) => api.post('/users/me/wallet/charge', { amount }).then((r) => r.data),
  getMyTransactions: (params) => api.get('/users/me/transactions', { params }).then((r) => r.data),
  getDashboard: (params) => api.get('/users/me/dashboard', { params }).then((r) => r.data),
  deleteMe: () => api.delete('/users/me').then((r) => r.data),
};
