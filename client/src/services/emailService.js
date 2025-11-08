// src/services/emailService.js
import api from './api';

export const sendEmail = (payload) => api.post('/email/send', payload);
export const saveDraft = (payload) => api.post('/email/drafts', payload);
export const updateDraft = (id, payload) => api.put(`/email/drafts/${id}`, payload);
export const sendDraft = (id) => api.post(`/email/drafts/${id}/send`);

export const getSentEmails = () => api.get('/email/sent');
export const getDrafts = () => api.get('/email/drafts');
export const getTrash = () => api.get('/email/trash');

// Inbox & Spam
export const getInbox = (params = {}) => api.get('/email/inbox', { params });
export const syncInbox = (params = {}) => api.post('/email/inbox/sync', null, { params });

export const moveMessage = (id, toFolder) => api.post(`/email/messages/${id}/move`, { toFolder });
export const restoreMessage = (id) => api.post(`/email/messages/${id}/restore`);
export const hardDeleteMessage = (id) => api.delete(`/email/messages/${id}`);

export const getEmailTemplates = () => api.get('/email/templates');
export const saveEmailTemplate = (payload) => api.post('/email/templates', payload);
export const deleteEmailTemplate = (templateName) => api.delete(`/email/templates/${templateName}`);

export const previewTemplate = (payload) => api.post('/email/templates/preview', payload);
export const previewTemplateForLead = (payload) => api.post('/email/templates/preview/lead', payload);

// MailAccount Management
export const createMailAccount = (payload) => api.post('/email/accounts', payload);
export const updateMailAccount = (id, payload) => api.put(`/email/accounts/${id}`, payload);
export const getMailAccount = () => api.get('/email/accounts');

// Seed default templates
export const seedDefaultTemplates = () => api.post('/email/templates/seed');

// Upload email attachment
export const uploadEmailAttachment = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  // Don't set Content-Type header - let axios set it automatically with boundary
  return api.post('/email/attachments', formData);
};