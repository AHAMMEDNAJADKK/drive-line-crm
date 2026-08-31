import api from './api';

export const getLeadsApi = (params) => api.get('/leads', { params });
export const getLeadApi = (id) => api.get(`/leads/${id}`);
export const createLeadApi = (data) => api.post('/leads', data);
export const updateLeadApi = (id, data) => api.patch(`/leads/${id}`, data);
export const deleteLeadApi = (id) => api.delete(`/leads/${id}`);
export const updateLeadStatusApi = (id, data) => api.patch(`/leads/${id}/status`, data);
export const assignLeadApi = (id, data) => api.patch(`/leads/${id}/assign`, data);
export const checkDuplicateApi = (mobile) => api.get('/leads/check-duplicate', { params: { mobile } });
export const getLeadFollowupsApi = (id) => api.get(`/leads/${id}/followups`);
export const addFollowupApi = (id, data) => api.post(`/leads/${id}/followups`, data);
export const getLeadActivityApi = (id) => api.get(`/leads/${id}/activity`);

export const exportExcelApi = (params) => {
  const token = localStorage.getItem('dl_token');
  const qs = new URLSearchParams({ ...params, token }).toString();
  window.open(`/api/leads/export/excel?${qs}`, '_blank');
};

export const exportPDFApi = (params) => {
  const token = localStorage.getItem('dl_token');
  const qs = new URLSearchParams({ ...params, token }).toString();
  window.open(`/api/leads/export/pdf?${qs}`, '_blank');
};

export const exportSingleLeadPDFApi = (id) => {
  const token = localStorage.getItem('dl_token');
  window.open(`/api/leads/${id}/export/pdf?token=${token}`, '_blank');
};
