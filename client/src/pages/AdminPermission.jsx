import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { withPermission } from '../modules/auth/withPermission';
const APPS = ['crm','kanban','email','money','todos','admin','files','notifications','image','billing'];
const SCOPES = ['read','write','manage'];

function MatrixToggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-6 rounded-full relative transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function AdminPermissions() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [enabledApps, setEnabledApps] = useState([]);
  const [dirty, setDirty] = useState({}); // key: `${app}:${scope}`

  useEffect(() => {
    (async () => {
      const res = await api.get('/users'); // implement a paged admin users list endpoint
      setUsers(res.data.users || []);
    })();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    (async () => {
      const res = await api.get(`/permissions/matrix/${selectedUser}`);
      setMatrix(res.data.matrix);
      setEnabledApps(res.data.enabledApps);
      setDirty({});
    })();
  }, [selectedUser]);

  const rows = useMemo(() => APPS.map(app => ({
    app,
    scopes: SCOPES.map(scope => ({ app, scope, value: matrix?.[app]?.[scope] || false }))
  })), [matrix]);

  const toggle = (app, scope) => {
    const current = matrix?.[app]?.[scope] || false;
    const next = { ...matrix, [app]: { ...(matrix[app]||{}), [scope]: !current } };
    setMatrix(next);
    setDirty(d => ({ ...d, [`${app}:${scope}`]: !current }));
    console.log("Matrix Updated:", next);
  };

  


  const save = async () => {
    const changes = Object.entries(dirty).map(([k, enabled]) => {
      const [appKey, scopeKey] = k.split(':'); return { appKey, scopeKey, enabled };
    });
    await api.post(`/permissions/matrix/${selectedUser}`, { changes });
    setDirty({});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Permissions</h1>
        <button disabled={!Object.keys(dirty).length}
          onClick={save}
          className={`px-4 py-2 rounded-md text-white ${Object.keys(dirty).length ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400'}`}>
          Save changeing
        </button>
      </div>
      <div className="flex gap-4 items-center">
        <label className="text-sm text-slate-600">Select user</label>
        <select className="border rounded-md px-3 py-2"
          value={selectedUser || ''} onChange={e => setSelectedUser(e.target.value)}>
          <option value="" disabled>Select...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.email} ({u.username})</option>)}
        </select>
      </div>
      {!!selectedUser && (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
            <div>App</div><div>Readsss</div><div>Write</div><div>Manage</div>
          </div>
          <div>
            {rows.map(r => (
              <div key={r.app} className="grid grid-cols-4 px-4 py-3 border-t items-center">
                <div className="font-medium">{r.app}</div>
                {r.scopes.map(s => (
                  <div key={s.scope} className="flex justify-start">
                    <MatrixToggle value={s.value} onChange={() => toggle(s.app, s.scope)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default withPermission('admin', 'manage')(AdminPermissions);
