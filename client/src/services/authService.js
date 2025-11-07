// client/src/services/authService.js
import api from './api';

export const signup = (payload) => api.post('/auth/signup', payload).then(r => r.data);
export const signin = (payload) => api.post('/auth/signin', payload).then(r => r.data);
export const verifyEmail = (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then(r => r.data);

export const refresh = (refreshToken) => api.post('/auth/refresh', { refreshToken }).then(r => r.data);

export const requestReset = (email) => api.post('/auth/password/forgot', { email }).then(r => r.data);
export const resetPassword = (token, password) => api.post('/auth/password/reset', { token, password }).then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data.user);
export const updateProfile = (payload) => api.put('/auth/me/profile', payload).then(r => r.data.user);
export const uploadPhoto = (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  // Don't set Content-Type header - let axios set it automatically with boundary
  return api.post('/auth/me/photo', formData).then(r => r.data.user);
};
export const changeEmail = (email) => api.post('/auth/me/change-email', { email }).then(r => r.data);
export const changePassword = (oldPassword, newPassword) => api.post('/auth/me/change-password', { oldPassword, newPassword }).then(r => r.data);

export const sendInvite = (email, roleName) => api.post('/auth/invite', { email, roleName }).then(r => r.data);
export const acceptInvite = (token, username, password, teamId = null) => api.post('/auth/invite/accept', { token, username, password, teamId }).then(r => r.data);
