import api from './api';

export const getUserMatrix = (userId) => api.get(`/permissions/matrix/${userId}`).then(r=>r.data);
export const updateUserMatrix = (userId, changes) => api.post(`/permissions/matrix/${userId}`, { changes }).then(r=>r.data);
export const listRoles = () => api.get('/permissions/roles').then(r=>r.data.roles);
export const createRole = (payload) => api.post('/permissions/roles', payload).then(r=>r.data.role);
export const updateRole = (roleId, payload) => api.put(`/permissions/roles/${roleId}`, payload).then(r=>r.data.role);
export const deleteRole = (roleId) => api.delete(`/permissions/roles/${roleId}`).then(r=>r.data);
export const getMyApps = () => api.get('/permissions/me/apps').then(r=>r.data);
