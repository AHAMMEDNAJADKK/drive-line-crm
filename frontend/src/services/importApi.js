import api from './api';

export const parseImportFileApi = (fileOrFormData) => {
  let data = fileOrFormData;
  if (fileOrFormData instanceof File) {
    data = new FormData();
    data.append('file', fileOrFormData);
  }
  return api.post('/import/parse', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const executeImportApi = (data) => api.post('/import/import', data);

export const downloadTemplateApi = () => {
  const token = localStorage.getItem('dl_token');
  window.open(`/api/import/template?token=${token}`, '_blank');
};
export const downloadImportTemplateApi = downloadTemplateApi;

export const downloadErrorReportApi = async (errorRows) => {
  const token = localStorage.getItem('dl_token');
  const response = await api.post(
    '/import/error-report',
    { errorRows },
    {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import_errors.xlsx';
  a.click();
  URL.revokeObjectURL(url);
};
export const downloadImportErrorsApi = downloadErrorReportApi;
