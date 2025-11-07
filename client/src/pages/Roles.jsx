import React, { useEffect, useState } from 'react';
import { createRole,deleteRole,updateRole,listRoles } from '../services/permissionService';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';

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
    <PageContainer>
      <PageHeader
        title="Roles Management"
        description="Create and manage roles with default permissions"
      />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="section-card">
          <h2 className="font-medium mb-3">Create Role</h2>
          <input className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-4 py-3 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 mb-3" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-4 py-3 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 mb-4" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          <div className="space-y-2">
            {APPS.map(a => (
              <div key={a}>
                <div className="text-sm font-medium">{a}</div>
                <div className="flex gap-2 mt-1">
                  {SCOPES.map(s => {
                    const on = !!form.defaults.find(d => d.appKey===a && d.scopeKey===s);
                    return (
                      <button key={s} onClick={()=>toggle(a,s)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${on ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-900/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button onClick={create} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-4 py-3 transition shadow-lg shadow-indigo-900/40">Create Role</button>
        </div>
        <div className="md:col-span-2 section-card">
          <h2 className="font-medium mb-3">Existing Roles</h2>
          <ul className="divide-y">
            {roles.map(r => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-slate-500 text-sm">{r.description}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async ()=>{ await deleteRole(r.id); load(); }} className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium transition">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
