// pages/Members.jsx
import React, { useEffect, useState } from 'react';
import { listUsers, assignRole, updateUser, deleteUser } from '../services/userService';
import { sendInvite } from '../services/authService';
import api from '../services/api';
import { PrimaryButton, SubtleButton } from '../components/GradientButton';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';

export default function Members() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [invite, setInvite] = useState({ email: '', roleName: 'Member' });
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', jobTitle: '', phone: '', isActive: true });

  const load = async () => {
    setLoading(true);
    try {
      const u = await listUsers();
      setUsers(u);
      const r = await api.get('/permissions/roles');
      setRoles(r.data.roles || []);
    } catch (err) {
      console.error('Failed to load', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendInvitation = async () => {
    if (!invite.email.trim()) return;
    setLoadingInvite(true);
    try {
      await sendInvite(invite.email.trim(), invite.roleName);
      setInvite({ email: '', roleName: 'Member' });
      alert('Invitation sent successfully!');
      load(); // Reload to see new member if they already existed
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoadingInvite(false);
    }
  };

  const changeRole = async (userId, roleId) => {
    try {
      await assignRole(userId, roleId);
      load();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      jobTitle: user.jobTitle || '',
      phone: user.phone || '',
      isActive: user.isActive !== false
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, editForm);
      setEditingUser(null);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteUser(userId);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete user');
    }
  };

  const getFullName = (user) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  const getInitials = (user) => {
    if (user.firstName || user.lastName) {
      return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || user.username?.[0]?.toUpperCase() || 'U';
    }
    return user.username?.[0]?.toUpperCase() || 'U';
  };

  const getDepartment = (user) => {
    if (user.teams && user.teams.length > 0) {
      return user.teams.map(t => t.team.name).join(', ');
    }
    return 'No Department';
  };

  return (
    <PageContainer>
      <PageHeader
        title="Team Directory"
        description="Manage team members, roles, and permissions"
      />

        {/* Invite Section */}
        <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 to-indigo-50/30 backdrop-blur-xl shadow-xl p-6">
          <div className="font-semibold text-slate-800 mb-4 text-lg">Invite Member</div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="flex-1 min-w-[250px] border border-slate-200 rounded-xl px-4 py-3 bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400"
              placeholder="email@company.com"
              value={invite.email}
              onChange={e => setInvite({ ...invite, email: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && sendInvitation()}
            />
            <select
              className="border border-slate-200 rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400"
              value={invite.roleName}
              onChange={e => setInvite({ ...invite, roleName: e.target.value })}
            >
              {['Owner', 'Admin', 'Member'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <PrimaryButton onClick={sendInvitation} disabled={loadingInvite || !invite.email.trim()}>
              {loadingInvite ? 'Sending...' : 'Send Invite'}
            </PrimaryButton>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Edit User</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    value={editForm.firstName}
                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    value={editForm.lastName}
                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    value={editForm.jobTitle}
                    onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
                </div>
                <div className="flex gap-3 justify-end">
                  <SubtleButton onClick={() => setEditingUser(null)}>Cancel</SubtleButton>
                  <PrimaryButton onClick={handleSaveUser}>Save</PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Table */}
        <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Members ({users.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No members yet. Invite someone to get started!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={[
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white',
                        'hover:bg-indigo-50/40 transition-colors',
                      ].join(' ')}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.photo ? (
                            <img src={u.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(u)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-800">{getFullName(u)}</div>
                            {u.username && <div className="text-xs text-slate-500">@{u.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{u.jobTitle || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {getDepartment(u)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {u.role?.name || 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400"
                          value={u.role?.id || ''}
                          onChange={e => changeRole(u.id, +e.target.value)}
                        >
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditUser(u)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </PageContainer>
  );
}
