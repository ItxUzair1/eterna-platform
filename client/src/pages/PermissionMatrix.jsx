// pages/PermissionMatrix.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getUserMatrix, updateUserMatrix } from '../services/permissionService';
import { listUsers } from '../services/userService';
import Toggle from '../components/Toggle';
import { PrimaryButton, SubtleButton } from '../components/GradientButton';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import { showError, showSuccess } from '../utils/toast';

const APPS = ['crm', 'kanban', 'email', 'money', 'todos', 'admin', 'files', 'notifications', 'image', 'billing'];
const SCOPES = ['read', 'write', 'manage'];

export default function PermissionsMatrix() {
  const { user } = useAuth();
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const allUsers = await listUsers();
        setUsers(allUsers);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) {
      setMatrix({});
      setDirty({});
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await getUserMatrix(userId);
        setMatrix(res?.matrix || {});
        setDirty({});
      } catch (err) {
        console.error('Failed to load matrix', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const rows = useMemo(
    () =>
      APPS.map((a) => ({
        app: a,
        scopes: SCOPES.map((s) => ({ scope: s, value: matrix?.[a]?.[s] || false })),
      })),
    [matrix]
  );

  const toggle = (app, scope) => {
    const next = { ...matrix, [app]: { ...(matrix[app] || {}), [scope]: !matrix?.[app]?.[scope] } };
    setMatrix(next);
    setDirty((d) => ({ ...d, [`${app}:${scope}`]: next[app][scope] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const changes = Object.entries(dirty).map(([k, enabled]) => {
        const [appKey, scopeKey] = k.split(':');
        return { appKey, scopeKey, enabled };
      });
      const res = await updateUserMatrix(userId, changes);
      setMatrix(res?.matrix || {});
      setDirty({});
      showSuccess('Permissions updated successfully!');
    } catch (err) {
      console.error('Failed to save', err);
      showError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(dirty).length > 0;
  const selectedUser = users.find((u) => u.id === parseInt(userId));

  return (
    <PageContainer>
      <PageHeader
        title="Permissions Management"
        description="Manage user permissions and app access"
        actions={
          <div className="flex gap-2">
            <SubtleButton onClick={() => setDirty({})} disabled={!hasChanges}>
              Discard
            </SubtleButton>
            <PrimaryButton onClick={save} disabled={!hasChanges || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </PrimaryButton>
          </div>
        }
      />

      {/* User Selector */}
      <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl p-6">
        <label className="block text-sm font-medium text-slate-700 mb-3">Select User</label>
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <select
            className="w-full md:max-w-md border border-slate-200 rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loading}
          >
            <option value="" disabled>
              Select a user...
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username} ({u.email})
                {u.id === user?.id ? ' (You)' : ''}
              </option>
            ))}
          </select>

          {selectedUser && (
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              {selectedUser.photoUrl || selectedUser.photo ? (
                <img
                  src={selectedUser.photoUrl || selectedUser.photo}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    const fallbackName =
                      `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() ||
                      selectedUser.username ||
                      'User';
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      fallbackName
                    )}&background=indigo&color=fff&size=128`;
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {(selectedUser.firstName?.[0] || selectedUser.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-slate-800">
                  {selectedUser.firstName || selectedUser.lastName
                    ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                    : selectedUser.username}
                </div>
                <div className="text-sm text-slate-600">{selectedUser.email}</div>
                {selectedUser.jobTitle && <div className="text-sm text-slate-500">{selectedUser.jobTitle}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card-style Permission Grid */}
      {userId && (
        <div className="mt-6 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Content Elements</h2>
              <p className="text-sm text-slate-500">Enable/disable app permissions for this user</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {/* Optional global toggle placeholder like screenshot's Enable All switch; non-functional by logic constraint */}
              <span className="text-sm text-slate-600">Enable All</span>
              <div className="opacity-50 pointer-events-none">
                <Toggle value={false} onChange={() => {}} />
              </div>
            </div>
          </div>

          {/* Responsive grid like screenshot: 3 columns desktop, 2 tablet, 1 mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((r) => (
              <div
                key={r.app}
                className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 flex items-center justify-between"
              >
                {/* Left: app name and optional badge */}
                <div className="min-w-0 pr-3">
                  <div className="text-slate-800 font-medium capitalize truncate">{r.app}</div>
                  {/* Optional badge variants to mimic POPULAR look from screenshot */}
                  {(r.app === 'team' || r.app === 'tabs' || r.app === 'testimonial') && (
                    <span className="mt-1 inline-block text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                      popular
                    </span>
                  )}
                </div>

                {/* Right: three tiny icon-like actions (read/write/manage) laid horizontally like mini switches */}
                <div className="flex items-center gap-3">
                  {r.scopes.map((s) => (
                    <div key={s.scope} className="flex items-center gap-1">
                      <Toggle value={!!s.value} onChange={() => toggle(r.app, s.scope)} />
                      <span className="text-[11px] text-slate-500 capitalize hidden md:inline">{s.scope}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky footer Save similar to screenshot */}
          <div className="flex justify-end mt-6">
            <PrimaryButton onClick={save} disabled={!hasChanges || saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {!userId && !loading && (
        <div className="text-center py-12 text-slate-500">Select a user to manage their permissions</div>
      )}
    </PageContainer>
  );
}
