// client/src/services/imageService.js
import api from './api';

export const createJob = (targetsCsv) => api.post('/image/jobs', { targets: targetsCsv });

export const uploadFiles = (jobId, files) => {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return api.post(`/image/jobs/${jobId}/files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const planTargets = (jobId, targets, fileIds = []) =>
  api.post(`/image/jobs/${jobId}/plan`, { targets, fileIds });

export const enqueueJob = (jobId) => api.post(`/image/jobs/${jobId}/queue`);

export const getJob = (jobId) => api.get(`/image/jobs/${jobId}`);

export const sseUrl = (jobId, token) =>
  `${api.defaults.baseURL}/image/jobs/${jobId}/sse?token=${encodeURIComponent(token)}`;

export const downloadOutput = (jobId, outputId) => {
  const token = localStorage.getItem('accessToken');
  const url = `${api.defaults.baseURL}/image/jobs/${jobId}/outputs/${outputId}?token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

export const downloadZip = (jobId) => {
  const token = localStorage.getItem('accessToken');
  const url = `${api.defaults.baseURL}/image/jobs/${jobId}/zip?token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

