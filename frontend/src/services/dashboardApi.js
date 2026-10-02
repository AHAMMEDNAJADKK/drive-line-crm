import api from './api';

export const getDashboardApi = (params) => api.get('/dashboard', { params });
