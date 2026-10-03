import api from './api';

export const getDashboardApi = (params) => api.get('/dashboard', { params });
export const getBranchOverviewApi = (params) => api.get('/dashboard/branch-overview', { params });
