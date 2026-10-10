import api from './api';

export const getSuperAdminDashboardApi = (branchId = '') => {
  const params = {};
  if (branchId) params.branchId = branchId;
  return api.get('/superadmin/dashboard', { params });
};

export const getSuperAdminUsersApi = (params = {}) => {
  return api.get('/superadmin/users', { params });
};

export const createSuperAdminUserApi = (data) => {
  return api.post('/superadmin/users', data);
};

export const updateSuperAdminUserApi = (id, data) => {
  return api.patch(`/superadmin/users/${id}`, data);
};

export const toggleSuperAdminUserStatusApi = (id, status) => {
  return api.patch(`/superadmin/users/${id}/status`, { status });
};

export const resetSuperAdminUserPasswordApi = (id, newPassword) => {
  return api.patch(`/superadmin/users/${id}/reset-password`, { newPassword });
};

export const getSuperAdminBranchAuditApi = () => {
  return api.get('/superadmin/branches/audit');
};

export const fixSuperAdminBranchAssignmentsApi = (data) => {
  return api.post('/superadmin/branches/fix-assignments', data);
};

export const getSuperAdminAuditLogsApi = (params = {}) => {
  return api.get('/superadmin/audit-logs', { params });
};
