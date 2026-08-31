import api from './api';

export const getEmployeesApi = (params) => api.get('/employees', { params });
export const getEmployeeApi = (id) => api.get(`/employees/${id}`);
export const createEmployeeApi = (data) => api.post('/employees', data);
export const updateEmployeeApi = (id, data) => api.patch(`/employees/${id}`, data);
export const toggleEmployeeStatusApi = (id, status) => api.patch(`/employees/${id}/status`, { status });
export const resetEmployeePasswordApi = (id, newPassword) => api.patch(`/employees/${id}/reset-password`, { newPassword });
export const getActiveEmployeesApi = () => api.get('/employees/active-list');
