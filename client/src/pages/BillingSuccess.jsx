import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import http from '../services/api';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('confirming'); // 'confirming' | 'success' | 'error'
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    const handleOk = () => {
      setStatus('success');
      setTimeout(() => navigate('/billing'), 3000);
    };
    const handleFail = (msg) => {
      setStatus('error');
      setError(msg || 'Failed to confirm subscription');
    };

    if (sessionId) {
      http.post('/billing/checkout/confirm', { sessionId })
        .then((res) => {
          if (res.data.ok) return handleOk();
          return http.post('/billing/reconcile')
            .then(r => (r.data.ok ? handleOk() : handleFail('Failed to reconcile subscription')));
        })
        .catch(() => {
          http.post('/billing/reconcile')
            .then(r => (r.data.ok ? handleOk() : handleFail('Failed to reconcile subscription')))
            .catch(e => handleFail(e?.response?.data?.error || e.message));
        });
    } else {
      http.post('/billing/reconcile')
        .then(r => (r.data.ok ? handleOk() : handleFail('Failed to reconcile subscription')))
        .catch(e => handleFail(e?.response?.data?.error || e.message));
    }
  }, [searchParams, navigate]);

  if (status === 'confirming') {
    return (
      <div
        className="min-h-screen grid place-items-center px-4
                   bg-slate-950
                   bg-[radial-gradient(800px_400px_at_10%_0%,rgba(99,102,241,.22),transparent_60%),radial-gradient(800px_400px_at_90%_100%,rgba(168,85,247,.22),transparent_60%)]"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 text-center shadow-2xl shadow-slate-900/30">
          <div role="status" aria-label="processing" className="flex items-center justify-center mb-3">
            <svg className="h-6 w-6 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Processing your payment...</h1>
          <p className="mt-1 text-slate-300">Please wait while the subscription is confirmed.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="min-h-screen grid place-items-center px-4
                   bg-slate-950
                   bg-[radial-gradient(800px_400px_at_10%_0%,rgba(99,102,241,.22),transparent_60%),radial-gradient(800px_400px_at_90%_100%,rgba(168,85,247,.22),transparent_60%)]"
      >
        <div className="w-full max-w-lg rounded-2xl border border-rose-400/30 bg-rose-50/10 backdrop-blur-xl p-6 text-center shadow-2xl shadow-rose-900/20">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
            <svg className="h-6 w-6 text-rose-400" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-rose-300">Payment Confirmation Error</h1>
          <p className="mt-1 text-rose-200">{error}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/billing')}
              type="button"
              className="rounded-xl px-4 py-2 font-semibold text-white
                         bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 bg-[length:200%_100%]
                         hover:bg-[position:100%_0%]
                         shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/35
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Back to Billing
            </button>
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="rounded-xl px-4 py-2 bg-white/90 text-slate-900 border border-white/20
                         hover:-translate-y-0.5 transition shadow-md hover:shadow-lg
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen grid place-items-center px-4
                 bg-slate-950
                 bg-[radial-gradient(800px_400px_at_10%_0%,rgba(34,211,238,.22),transparent_60%),radial-gradient(800px_400px_at_90%_100%,rgba(168,85,247,.22),transparent_60%)]"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 text-center shadow-2xl shadow-slate-900/30">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full
                        bg-emerald-500/10 ring-1 ring-emerald-400/30">
          <span className="text-3xl leading-none text-emerald-400">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300">
          Payment Successful!
        </h1>
        <p className="mt-1 text-slate-200">Your subscription has been activated. You will be redirected to the billing page shortly.</p>
        <div className="mt-5">
          <button
            onClick={() => navigate('/billing')}
            type="button"
            className="rounded-xl px-4 py-2 font-semibold text-white
                       bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 bg-[length:200%_100%]
                       hover:bg-[position:100%_0%]
                       shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/35
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Go to Billing Page
          </button>
        </div>
      </div>
    </div>
  );
}
