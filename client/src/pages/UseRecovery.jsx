// client/src/pages/UseRecovery.jsx
import React, { useState } from 'react';
import { useRecovery, verify2fa } from '../services/authService';

export default function UseRecovery() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await useRecovery(code.trim());
      // After using recovery, attempt to finalize 2FA with a placeholder code path:
      const t = localStorage.getItem('twofaToken');
      const { token } = await verify2fa(t, code.trim()); // or backend path that accepts recovery directly
      localStorage.removeItem('twofaToken');
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } catch (e) { setErr(e?.response?.data?.error || 'Invalid recovery code'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-2">Use a recovery code</h2>
        {msg && <div className="mb-3 rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{msg}</div>}
        {err && <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
        <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="recovery‑code" />
        <button className="mt-4 w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">Continue</button>
      </form>
    </div>
  );
}
