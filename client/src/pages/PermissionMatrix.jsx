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
        // Filter out current user or show all - admin should see all users
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
    () => APPS.map(a => ({ app: a, scopes: SCOPES.map(s => ({ scope: s, value: matrix?.[a]?.[s] || false })) })),
    [matrix]
  );

  const toggle = (app, scope) => {
    const next = { ...matrix, [app]: { ...(matrix[app] || {}), [scope]: !matrix?.[app]?.[scope] } };
    setMatrix(next);
    setDirty(d => ({ ...d, [`${app}:${scope}`]: next[app][scope] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const changes = Object.entries(dirty).map(([k, enabled]) => {
        const [appKey, scopeKey] = k.split(':');
        return { appKey, scopeKey, enabled };
      });
      const res = await updateUserMatrix(userId, changes);
      // Reload matrix after save to reflect changes
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
  const selectedUser = users.find(u => u.id === parseInt(userId));

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
          <select
            className="w-full max-w-md border border-slate-200 rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            disabled={loading}
          >
            <option value="" disabled>Select a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username} ({u.email})
                {u.id === user?.id ? ' (You)' : ''}
              </option>
            ))}
          </select>
          {selectedUser && (
            <div className="mt-4 flex items-center gap-3">
              {selectedUser.photo ? (
                <img src={selectedUser.photo} alt="" className="w-12 h-12 rounded-full object-cover" />
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

        {/* Permissions Matrix */}
        {userId && (
          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Permission Matrix</h2>
              <p className="text-indigo-100 text-sm mt-1">Enable/disable app permissions for this user</p>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header */}
                <div className="grid grid-cols-4 bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-200">
                  <div>App</div>
                  <div>Read</div>
                  <div>Write</div>
                  <div>Manage</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {rows.map((r, idx) => (
                    <div
                      key={r.app}
                      className={[
                        'grid grid-cols-4 px-6 py-4 items-center transition-colors',
                        idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white',
                        'hover:bg-indigo-50/40',
                      ].join(' ')}
                    >
                      <div className="font-medium capitalize text-slate-800">{r.app}</div>
                      {r.scopes.map(s => (
                        <div key={s.scope} className="flex items-center">
                          <Toggle value={!!s.value} onChange={() => toggle(r.app, s.scope)} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!userId && !loading && (
          <div className="text-center py-12 text-slate-500">
            Select a user to manage their permissions
          </div>
        )}
    </PageContainer>
  );
}
