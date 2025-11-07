import React, { useEffect, useState } from 'react';
import { createRole,deleteRole,updateRole,listRoles } from '../services/permissionService';

const APPS = ['crm','kanban','email','money','todos','admin','files','notifications','image','billing'];
const SCOPES = ['read','write','manage'];

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', defaults: [] });

  const load = async () => setRoles(await listRoles());
  useEffect(() => { load(); }, []);

  const toggle = (appKey, scopeKey) => {
    const exists = form.defaults.find(d => d.appKey === appKey && d.scopeKey === scopeKey);
    const defaults = exists ? form.defaults.filter(d => !(d.appKey===appKey && d.scopeKey===scopeKey))
                            : [...form.defaults, { appKey, scopeKey }];
    setForm({ ...form, defaults });
  };

  const create = async () => { await createRole(form); setForm({ name:'', description:'', defaults:[] }); load(); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Roles</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-3">Create Role</h2>
          <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="border rounded-md px-3 py-2 w-full mb-3" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          <div className="space-y-2">
            {APPS.map(a => (
              <div key={a}>
                <div className="text-sm font-medium">{a}</div>
                <div className="flex gap-2 mt-1">
                  {SCOPES.map(s => {
                    const on = !!form.defaults.find(d => d.appKey===a && d.scopeKey===s);
                    return (
                      <button key={s} onClick={()=>toggle(a,s)}
                        className={`px-2 py-1 rounded border text-sm ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button onClick={create} className="mt-4 px-4 py-2 rounded-md bg-indigo-600 text-white">Create</button>
        </div>
        <div className="md:col-span-2 border rounded-lg p-4">
          <h2 className="font-medium mb-3">Existing Roles</h2>
          <ul className="divide-y">
            {roles.map(r => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-slate-500 text-sm">{r.description}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async ()=>{ await deleteRole(r.id); load(); }} className="px-3 py-1 rounded border text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
