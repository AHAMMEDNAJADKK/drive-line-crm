import api from './api';

export const getBranchesApi = (params) => api.get('/branches', { params });

export const getActiveBranchesListApi = () => api.get('/branches/active-list');

export const getBranchApi = (id) => api.get(`/branches/${id}`);

export const createBranchApi = (data) => api.post('/branches', data);

export const updateBranchApi = (id, data) => api.patch(`/branches/${id}`, data);

export const toggleBranchStatusApi = (id, status) =>
  api.patch(`/branches/${id}/status`, { status });

export const assignBranchUserApi = (branchId, data) =>
  api.post(`/branches/${branchId}/assign-user`, data);
