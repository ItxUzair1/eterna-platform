// client/src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { verifyEmail } from '../services/authService';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    (async () => {
      try { await verifyEmail(t || ''); setStatus('ok'); setMsg('Email verified. You can sign in now.'); }
      catch (e) { setStatus('err'); setMsg(e?.response?.data?.error || 'Invalid or expired link'); }
    })();
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-center">
        <h2 className="text-white text-xl font-semibold mb-2">Verify email</h2>
        <p className={`text-sm ${status==='ok' ? 'text-emerald-300' : status==='err' ? 'text-red-300' : 'text-slate-300'}`}>{msg || 'Verifying…'}</p>
        <div className="mt-4">
          <a href="/" className="text-indigo-300 hover:text-indigo-200">Go to sign in</a>
        </div>
      </div>
    </div>
  );
}
