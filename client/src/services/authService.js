import api from './api';

export const signup = (payload) => api.post('/auth/signup', payload).then(r => r.data);
export const signin = (payload) => api.post('/auth/signin', payload).then(r => r.data);
export const verifyEmail = (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then(r => r.data);

export const requestReset = (email) => api.post('/auth/password/forgot', { email }).then(r => r.data);
export const resetPassword = (token, password) => api.post('/auth/password/reset', { token, password }).then(r => r.data);

export const verify2fa = (twofaToken, code) => api.post('/auth/2fa/verify', { twofaToken, code }).then(r => r.data);
export const enable2fa = (phone) => api.post('/auth/2fa/enable', { phone }).then(r => r.data);
export const useRecovery = (code) => api.post('/auth/2fa/recovery', { code }).then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data.user);
export const updateProfile = (payload) => api.put('/auth/me/profile', payload).then(r => r.data.user);
export const changeEmail = (email) => api.post('/auth/me/change-email', { email }).then(r => r.data);
export const changePassword = (oldPassword, newPassword) => api.post('/auth/me/change-password', { oldPassword, newPassword }).then(r => r.data);

export const sendInvite = (email, roleName) => api.post('/auth/invite', { email, roleName }).then(r => r.data);
export const acceptInvite = (token, username, password) => api.post('/auth/invite/accept', { token, username, password }).then(r => r.data);
