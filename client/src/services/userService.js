import api from './api';

export const listUsers = (params = {}) => api.get('/permissions/members', { params }).then(r => r.data.users);
export const listOwnersMinimal = () => api.get('/permissions/users-minimal').then(r => r.data.users || []);
export const assignRole = (userId, roleId) => api.put(`/permissions/members/${userId}/role`, { roleId }).then(r => r.data);
export const updateUser = (userId, data) => api.put(`/permissions/members/${userId}`, data).then(r => r.data.user);
export const deleteUser = (userId) => api.delete(`/permissions/members/${userId}`).then(r => r.data);
