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
          <div className="relative p-8">
            <div className="mb-6 text-center">
              <h2 className="text-white text-2xl font-semibold">Forgot password</h2>
              <p className="text-slate-300 text-sm mt-1">Enter your email to receive a reset link</p>
            </div>

            {sent ? (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 mb-4">
                If an account exists, a reset link has been sent to your email.
              </div>
            ) : (
              <>
                {err && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {err}
                  </div>
                )}
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1">
                      Email address
                    </label>
                    <div className="relative group">
                      <input
                        id="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-400 px-4 py-3 outline-none ring-0 transition focus:border-indigo-400 focus:bg-slate-900/70"
                        placeholder="you@example.com"
                        type="email"
                        required
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5 group-focus-within:ring-indigo-400/40 transition" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-4 py-3 transition shadow-lg shadow-indigo-900/40"
                  >
                    Send reset link
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-indigo-300 hover:text-indigo-200 transition">
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
