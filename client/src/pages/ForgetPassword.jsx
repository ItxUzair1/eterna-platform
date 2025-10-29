// client/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { requestReset } from '../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await requestReset(email.trim());
      setSent(true);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Could not send reset link');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-2">Forgot password</h2>
        <p className="text-slate-300 text-sm mb-4">Enter your email to receive a reset link.</p>
        {sent ? (
          <div className="rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            If an account exists, a reset link has been sent.
          </div>
        ) : (
          <>
            {err && <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
            <form onSubmit={submit} className="space-y-3">
              <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="you@example.com" type="email" />
              <button className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">Send reset link</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
