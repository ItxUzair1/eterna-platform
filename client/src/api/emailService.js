import api from './api';

export const sendEmail = (data) => api.post('/email/send', data);
export const getSentEmails = () => api.get('/email/sent');
export const getEmailTemplates = () => api.get('/email/templates');
export const saveEmailTemplate = (data) => api.post('/email/templates', data);
