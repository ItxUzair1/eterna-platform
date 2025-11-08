// client/src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { verifyEmail } from '../services/authService';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get('token');
    const newEmail = qs.get('newEmail');
    
    if (!t) {
      setStatus('err');
      setMsg('Verification token is missing. Please check your email and use the complete verification link.');
      return;
    }
    
    (async () => {
      try {
        await verifyEmail(t, newEmail || undefined);
        setStatus('ok');
        setMsg(newEmail ? 'Email changed and verified. You can sign in with your new email now.' : 'Email verified. You can sign in now.');
      }
      catch (e) { 
        setStatus('err'); 
        setMsg(e?.response?.data?.error || 'Invalid or expired link. Please request a new verification email.');
      }
    })();
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mr-3">
            <span className="text-indigo-300 font-bold text-lg">∞</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Eterna
          </h1>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative p-8 text-center">
            <div className="mb-6">
              <h2 className="text-white text-2xl font-semibold mb-2">Verify email</h2>
              {status === 'verifying' && (
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-sm">Verifying…</span>
                </div>
              )}
              {status === 'ok' && (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 mb-4">
                  {msg || 'Email verified successfully!'}
                </div>
              )}
              {status === 'err' && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-4">
                  {msg || 'Verification failed'}
                </div>
              )}
            </div>
            <div className="mt-6">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-4 py-3 transition shadow-lg shadow-indigo-900/40"
              >
                Go to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
