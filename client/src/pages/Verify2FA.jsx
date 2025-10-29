import React, { useState } from 'react';
import { verify2fa } from '../services/authService';

export default function Verify2FA() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const twofaToken = localStorage.getItem('twofaToken');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { token } = await verify2fa(twofaToken, code.trim());
      localStorage.removeItem('twofaToken');
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } catch (e) {
      setErr(e?.response?.data?.error || 'Invalid code');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-2">Two‑Factor Authentication</h2>
        <p className="text-slate-300 text-sm mb-4">Enter the 6‑digit code sent to your WhatsApp.</p>
        {err && <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
        <input value={code} onChange={(e)=>setCode(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="123456" />
        <button disabled={loading || code.length < 6} className="mt-4 w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">{loading?'Verifying…':'Verify'}</button>
        <a href="/use-recovery" className="block text-center text-xs text-indigo-300 mt-3">Use a recovery code</a>
      </form>
    </div>
  );
}
