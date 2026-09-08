import api from './api';

export const getHrDashboardApi = () => api.get('/dashboard/hr');
export const getNotificationsApi = () => api.get('/notifications');
export const markNotificationAsReadApi = (id) =>
  api.patch(`/notifications/${id}/read`);
export const markAllNotificationsAsReadApi = () =>
  api.patch('/notifications/read-all');

