import api from './api';

export const loginApi = (data) =>
  api.post('/auth/login', data);

export const registerFirstAdminApi = (data) =>
  api.post('/auth/register-first-admin', data);

export const getMeApi = () =>
  api.get('/auth/me');

export const logoutApi = () =>
  api.post('/auth/logout');

export const updateProfileApi = (data) =>
  api.patch('/auth/me', data);