// client/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { resetPassword } from '../services/authService';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (password.length < 8 || password !== confirm) {
      return setErr('Passwords must match and be at least 8 characters.');
    }
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-2">Reset password</h2>
        {done ? (
          <div className="text-slate-200">
            Password updated. <a href="/" className="text-indigo-300 hover:text-indigo-200">Sign in</a>
          </div>
        ) : (
          <>
            {err && <div className="mb-3 rounded border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
            <form onSubmit={submit} className="space-y-3">
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="New password" />
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white px-4 py-3" placeholder="Confirm password" />
              <button className="w-full rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-3">Update password</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
