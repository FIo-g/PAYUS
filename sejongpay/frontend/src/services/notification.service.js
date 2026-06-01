// src/services/notification.service.js
import api from './api';

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }).then((r) => r.data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => api.put('/notifications/read-all').then((r) => r.data),
  delete: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
};
