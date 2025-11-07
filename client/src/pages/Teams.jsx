import React, { useEffect, useState } from 'react';
import {
  listTeams, createTeam, updateTeam, deleteTeam,
  getTeamMembers, addTeamMember, removeTeamMember, inviteToTeam,
  getTeamPermissions, setTeamPermissions
} from '../services/teamService';
import { listUsers } from '../services/userService';
import Toggle from '../components/Toggle';
import { PrimaryButton, SubtleButton } from '../components/GradientButton';

const APPS = ['crm', 'kanban', 'email', 'money', 'todos', 'admin', 'files', 'notifications', 'image', 'billing'];
const SCOPES = ['read', 'write', 'manage'];

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [view, setView] = useState('list'); // 'list', 'members', 'permissions'
  const [matrix, setMatrix] = useState({});
  const [dirty, setDirty] = useState({});
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create/Edit Team
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamForm, setTeamForm] = useState({ name: '' });

  // Invite Member
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', roleName: 'Member' });

  const loadTeams = async () => {
    setLoading(true);
    try {
      const ts = await listTeams();
      setTeams(ts || []);
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (teamId) => {
    setLoading(true);
    try {
      const ms = await getTeamMembers(teamId);
      setMembers(ms || []);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await listUsers();
      setAllUsers(users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  useEffect(() => {
    loadTeams();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      setMatrix({});
      setDirty({});
      setMembers([]);
      setView('list');
      return;
    }

    if (view === 'permissions') {
      loadPermissions();
    } else if (view === 'members') {
      loadMembers(selectedTeamId);
    }
  }, [selectedTeamId, view]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const res = await getTeamPermissions(selectedTeamId);
      setMatrix(res.matrix || {});
      setDirty({});
    } catch (err) {
      console.error('Failed to load permissions', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTeam = teams.find(t => t.id === parseInt(selectedTeamId, 10));

  // Team CRUD
  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) return;
    setSaving(true);
    try {
      await createTeam(teamForm.name.trim());
      setTeamForm({ name: '' });
      setShowTeamForm(false);
      loadTeams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamForm.name.trim() || !editingTeam) return;
    setSaving(true);
    try {
      await updateTeam(editingTeam.id, teamForm.name.trim());
      setEditingTeam(null);
      setTeamForm({ name: '' });
      loadTeams();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? This will remove all members and permissions.')) return;
    try {
      await deleteTeam(teamId);
      if (selectedTeamId === String(teamId)) {
        setSelectedTeamId('');
      }
      loadTeams();
    } catch (err) {
      alert('Failed to delete team');
    }
  };

  const startEditTeam = (team) => {
    setEditingTeam(team);
    setTeamForm({ name: team.name });
    setShowTeamForm(true);
  };

  // Members
  const handleAddMember = async (userId) => {
    try {
      await addTeamMember(selectedTeamId, userId);
      loadMembers(selectedTeamId);
      loadAllUsers();
    } catch (err) {
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await removeTeamMember(selectedTeamId, userId);
      loadMembers(selectedTeamId);
      loadAllUsers();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const handleInviteToTeam = async () => {
    if (!inviteForm.email.trim()) return;
    setSaving(true);
    try {
      await inviteToTeam(selectedTeamId, inviteForm.email.trim(), inviteForm.roleName);
      setInviteForm({ email: '', roleName: 'Member' });
      setShowInviteForm(false);
      alert('Invitation sent successfully!');
      loadMembers(selectedTeamId);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  // Permissions
  const togglePermission = (app, scope) => {
    const next = { ...matrix, [app]: { ...(matrix[app] || {}), [scope]: !matrix?.[app]?.[scope] } };
    setMatrix(next);
    setDirty(d => ({ ...d, [`${app}:${scope}`]: next[app][scope] }));
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
    const grants = Object.entries(dirty).map(([k, enabled]) => {
        const [appKey, scopeKey] = k.split(':');
        return { appKey, scopeKey, enabled };
      });
      await setTeamPermissions(selectedTeamId, grants);
      setDirty({});
    } catch (err) {
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const rows = APPS.map(a => ({
    app: a,
    scopes: SCOPES.map(s => ({ scope: s, value: matrix?.[a]?.[s] || false }))
  }));

  const getFullName = (user) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  const getInitials = (user) => {
    if (user.firstName || user.lastName) {
      return ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase()
        || user.username?.[0]?.toUpperCase() || 'U';
    }
    return user.username?.[0]?.toUpperCase() || 'U';
  };

  const memberUserIds = members.map(m => m.user.id);
  const availableUsers = allUsers.filter(u => !memberUserIds.includes(u.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Teams & Groups
            </h1>
            <p className="text-slate-600 mt-1">Create teams, manage members, and set permissions</p>
          </div>
          <PrimaryButton onClick={() => { setShowTeamForm(true); setEditingTeam(null); setTeamForm({ name: '' }); }}>
            + Create Team
          </PrimaryButton>
        </div>

        {/* Create/Edit Team Modal */}
        {showTeamForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Team Name</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    placeholder="e.g., Development Team"
                    value={teamForm.name}
                    onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <SubtleButton onClick={() => { setShowTeamForm(false); setEditingTeam(null); setTeamForm({ name: '' }); }}>
                    Cancel
                  </SubtleButton>
                  <PrimaryButton
                    onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                    disabled={!teamForm.name.trim() || saving}
                  >
                    {saving ? 'Saving...' : editingTeam ? 'Update' : 'Create'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Invite to Team</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    placeholder="email@company.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Default Role</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                    value={inviteForm.roleName}
                    onChange={e => setInviteForm({ ...inviteForm, roleName: e.target.value })}
                  >
                    {['Owner', 'Admin', 'Member'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <SubtleButton onClick={() => { setShowInviteForm(false); setInviteForm({ email: '', roleName: 'Member' }); }}>
                    Cancel
                  </SubtleButton>
                  <PrimaryButton onClick={handleInviteToTeam} disabled={!inviteForm.email.trim() || saving}>
                    {saving ? 'Sending...' : 'Send Invite'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams List */}
        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <div
                key={team.id}
                className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl p-6 hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => { setSelectedTeamId(String(team.id)); setView('members'); }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{team.name}</h3>
                    <p className="text-sm text-slate-600">
                      {team.members?.length || 0} {team.members?.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditTeam(team); }}
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
        </button>
      </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <SubtleButton
                    onClick={(e) => { e.stopPropagation(); setSelectedTeamId(String(team.id)); setView('members'); }}
                    className="flex-1"
                  >
                    Members
                  </SubtleButton>
                  <SubtleButton
                    onClick={(e) => { e.stopPropagation(); setSelectedTeamId(String(team.id)); setView('permissions'); }}
                    className="flex-1"
                  >
                    Permissions
                  </SubtleButton>
      </div>
          </div>
            ))}
            {teams.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No teams yet. Create your first team to get started!
              </div>
            )}
          </div>
        )}

        {/* Team Members View */}
        {view === 'members' && selectedTeam && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => { setView('list'); setSelectedTeamId(''); }}
                  className="text-indigo-600 hover:text-indigo-700 mb-2"
                >
                  ← Back to Teams
                </button>
                <h2 className="text-2xl font-semibold text-slate-800">{selectedTeam.name} - Members</h2>
              </div>
              <div className="flex gap-2">
                <SubtleButton onClick={() => { setSelectedTeamId(String(selectedTeam.id)); setView('permissions'); }}>
                  View Permissions
                </SubtleButton>
                <PrimaryButton onClick={() => setShowInviteForm(true)}>+ Invite Member</PrimaryButton>
              </div>
            </div>

            {/* Current Members */}
            <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">Team Members ({members.length})</h3>
              </div>
              {loading ? (
                <div className="p-12 text-center text-slate-500">Loading...</div>
              ) : members.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No members yet. Invite someone to join!</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {members.map((member, idx) => (
                    <div
                      key={member.id}
                      className={[
                        'px-6 py-4 flex items-center justify-between',
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white',
                        'hover:bg-indigo-50/40 transition-colors',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                          {getInitials(member.user)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{getFullName(member.user)}</div>
                          <div className="text-sm text-slate-500">{member.user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{member.role?.name || 'Member'}</span>
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
            </div>
          ))}
        </div>
      )}
            </div>

            {/* Add Existing Users */}
            <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Existing User</h3>
              {availableUsers.length === 0 ? (
                <div className="text-slate-500">Everyone is already a member.</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleAddMember(u.id)}
                      className="group inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <span className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold">
                        {getInitials(u)}
                      </span>
                      <span className="text-sm text-slate-700">{getFullName(u)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permissions View */}
        {view === 'permissions' && selectedTeam && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => { setView('members'); }}
                  className="text-indigo-600 hover:text-indigo-700 mb-2"
                >
                  ← Back to Members
                </button>
                <h2 className="text-2xl font-semibold text-slate-800">{selectedTeam.name} - Permissions</h2>
              </div>
              <div className="flex gap-2">
                <SubtleButton onClick={() => loadPermissions()}>Reset</SubtleButton>
                <PrimaryButton onClick={handleSavePermissions} disabled={!Object.keys(dirty).length || saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </PrimaryButton>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 sticky top-0">
                <div>App</div>
                <div>Read</div>
                <div>Write</div>
                <div>Manage</div>
              </div>
              {rows.map((r, idx) => (
                <div
                  key={r.app}
                  className={[
                    'grid grid-cols-4 px-4 py-3 items-center',
                    idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white',
                    'hover:bg-indigo-50/40 transition-colors',
                    'border-t border-slate-100',
                  ].join(' ')}
                >
                  <div className="font-medium capitalize text-slate-800">{r.app}</div>
                  {r.scopes.map(s => (
                    <div key={s.scope} className="flex">
                      <Toggle value={!!s.value} onChange={() => togglePermission(r.app, s.scope)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
