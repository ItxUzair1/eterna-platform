import React, { useState } from 'react';
import { enable2fa } from '../services/authService';

export default function Enable2FA() {
  const [phone, setPhone] = useState('');
  const [codes, setCodes] = useState([]);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { recoveryCodes } = await enable2fa(phone.trim());
      setCodes(recoveryCodes);
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to enable 2FA'); }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-white text-2xl font-semibold mb-2">Enable WhatsApp 2FA</h2>
      <p className="text-slate-300 mb-4 text-sm">We’ll send codes to your WhatsApp number.</p>
      {err && <div className="mb-3 text-red-200 bg-red-500/10 border border-red-400/30 px-3 py-2 rounded">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="+92xxxxxxxxxx" />
        <button className="rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">Enable 2FA</button>
      </form>
      {codes.length>0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-white font-semibold mb-2">Recovery codes</h3>
          <p className="text-slate-300 text-sm mb-2">Save these codes. Each can be used once.</p>
          <div className="grid grid-cols-2 gap-2">
            {codes.map(c => <code key={c} className="text-slate-200 bg-slate-900/60 px-2 py-1 rounded">{c}</code>)}
          </div>
        </div>
      )}
    </div>
  );
}
