import api from './api';

// Team CRUD
export const listTeams = () => api.get('/teams').then(r => r.data.teams);
export const createTeam = (name) => api.post('/teams', { name }).then(r => r.data.team);
export const updateTeam = (teamId, name) => api.put(`/teams/${teamId}`, { name }).then(r => r.data.team);
export const deleteTeam = (teamId) => api.delete(`/teams/${teamId}`).then(r => r.data);

// Team Members
export const getTeamMembers = (teamId) => api.get(`/teams/${teamId}/members`).then(r => r.data.members);
export const addTeamMember = (teamId, userId) => api.post(`/teams/${teamId}/members`, { userId }).then(r => r.data);
export const removeTeamMember = (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`).then(r => r.data);
export const inviteToTeam = (teamId, email, roleName) => api.post(`/teams/${teamId}/invite`, { email, roleName }).then(r => r.data);

// Team Permissions
export const getTeamPermissions = (teamId) => api.get(`/permissions/teams/${teamId}/permissions`).then(r => r.data);
export const setTeamPermissions = (teamId, grants) => api.post(`/permissions/teams/${teamId}/permissions`, { grants }).then(r => r.data);
