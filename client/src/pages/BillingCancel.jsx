import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen grid place-items-center px-4
                 bg-slate-950
                 bg-[radial-gradient(800px_400px_at_10%_0%,rgba(99,102,241,.22),transparent_60%),radial-gradient(800px_400px_at_90%_100%,rgba(168,85,247,.22),transparent_60%)]"
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-amber-50/10 backdrop-blur-xl p-6 text-center shadow-2xl shadow-amber-900/20">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-400/30">
          <svg className="h-6 w-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-red-300">
          Payment Cancelled
        </h1>
        <p className="mt-2 text-slate-200">Your payment was cancelled. No charges were made.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            type="button"
            className="rounded-xl px-4 py-2 font-semibold text-white
                       bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 bg-[length:200%_100%]
                       hover:bg-[position:100%_0%]
                       shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/35
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 transition"
          >
            Back to Billing
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            type="button"
            className="rounded-xl px-4 py-2 bg-white/90 text-slate-900 border border-white/20
                       hover:-translate-y-0.5 transition shadow-md hover:shadow-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

