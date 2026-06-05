// src/services/merchant.service.js
import api from './api';

export const merchantService = {
  getAll: (params) => api.get('/merchants', { params }).then((r) => r.data),
  getMine: () => api.get('/merchants/me').then((r) => r.data),
  getNearby: (params) => api.get('/merchants/nearby', { params }).then((r) => r.data),
  getById: (id) => api.get(`/merchants/${id}`).then((r) => r.data),
  update: (id, data) => api.put(`/merchants/${id}`, data).then((r) => r.data),
  getStaticQr: (id) => api.get(`/merchants/${id}/qrcode/static`).then((r) => r.data),
  generateDynamicQr: (id) => api.post(`/merchants/${id}/qrcode/dynamic`).then((r) => r.data),
  getSales: (id, params) => api.get(`/merchants/${id}/sales`, { params }).then((r) => r.data),
  getSettlement: (id, params) => api.get(`/merchants/${id}/settlement`, { params }).then((r) => r.data),
  getReviews: (id, params) => api.get(`/merchants/${id}/reviews`, { params }).then((r) => r.data),
  createReview: (id, data) => api.post(`/merchants/${id}/reviews`, data).then((r) => r.data),
};
