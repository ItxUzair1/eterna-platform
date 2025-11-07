import api from './api';

export const fetchNotifications = (params = {}) => api.get('/notifications', { params }).then(r => r.data.notifications || []);
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`).then(r => r.data);
export const markAllNotificationsRead = () => api.post('/notifications/read-all').then(r => r.data);

