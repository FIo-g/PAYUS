// src/services/transaction.service.js
import api from './api';

export const transactionService = {
  payment: (data) => api.post('/transactions/payment', data).then((r) => r.data),
  verifyPayment: (data) => api.post('/transactions/payment/verify', data).then((r) => r.data),
  getAll: (params) => api.get('/transactions', { params }).then((r) => r.data),
  getById: (id) => api.get(`/transactions/${id}`).then((r) => r.data),
  getMonthlyStats: () => api.get('/transactions/stats/monthly').then((r) => r.data),
};
