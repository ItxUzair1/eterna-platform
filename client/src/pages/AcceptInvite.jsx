// client/src/pages/AcceptInvite.jsx
import React, { useEffect, useState } from 'react';
import { acceptInvite } from '../services/authService';

export default function AcceptInvite() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await acceptInvite(token, username.trim(), password);
      setOk(true);
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to accept invite'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-2">Accept invitation</h2>
        {ok ? (
          <div className="text-slate-200">Account created. <a href="/" className="text-indigo-300">Sign in</a></div>
        ) : (
          <>
            {err && <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
            <form onSubmit={submit} className="space-y-3">
              <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="Choose a username" />
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="Set a password" />
              <button className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">Create account</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
