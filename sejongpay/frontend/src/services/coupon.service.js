// src/services/coupon.service.js
import api from './api';

export const couponService = {
  getMine: (params) => api.get('/coupons/me', { params }).then((r) => r.data),
  getAvailable: (merchantId) => api.get(`/coupons/available/${merchantId}`).then((r) => r.data),
  claim: (templateId) => api.post(`/coupons/${templateId}/claim`).then((r) => r.data),
  createTemplate: (data) => api.post('/coupons/templates', data).then((r) => r.data),
};
