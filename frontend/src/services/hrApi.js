import api from './api';

export const getHrDashboardApi = () => api.get('/dashboard/hr');
export const getNotificationsApi = () => api.get('/notifications');
