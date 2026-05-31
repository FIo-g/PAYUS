// src/services/stamp.service.js
import api from './api';

export const stampService = {
  getAll: () => api.get('/stamps').then((r) => r.data),
  getByMerchant: (merchantId) => api.get(`/stamps/${merchantId}`).then((r) => r.data),
  redeem: (id) => api.post(`/stamps/${id}/redeem`).then((r) => r.data),
};
