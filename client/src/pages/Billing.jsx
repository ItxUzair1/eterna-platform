import React, { useEffect, useState } from 'react';
import http from '../services/api';
import UpgradeModal from '../billing/UpgradeModal';
import TrialBanner from '../components/banners/TrialBanner';
import useBillingStore from '../store/billingStore';

export default function Billing() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    http.get('/me/billing')
      .then(res => setData(res.data))
      .catch(e => setError(e.message));
  }, []);

  const onPortal = async () => {
    try {
      const res = await http.post('/billing/portal', {});
      window.location = res.data.url;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to open billing portal';
      if (msg.includes('Stripe Customer Portal is not configured')) {
        const confirmed = window.confirm(
          `${msg}\n\nWould you like to open the Stripe Dashboard to configure it now?`
        );
        if (confirmed) {
          window.open('https://dashboard.stripe.com/test/settings/billing/portal', '_blank');
        }
      } else {
        alert(`Error: ${msg}`);
      }
      console.error('Portal error:', e.response?.data || e);
    }
  };

  const onUpgrade = () => {
    useBillingStore.getState().openUpgradeModal({ code: 'UPGRADE_CLICK', attemptedAction: 'billing_change_plan' });
  };

  const isTestMode = window.location.hostname === 'localhost' || import.meta.env.DEV;

  return (
    <div
      className="min-h-screen w-full p-4 sm:p-6
                 bg-slate-950 text-slate-100
                 bg-[radial-gradient(800px_400px_at_10%_0%,rgba(99,102,241,.22),transparent_60%),radial-gradient(800px_400px_at_90%_100%,rgba(168,85,247,.22),transparent_60%)]"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">
          Billing
        </h1>

        <p className="mt-2">
          <a
            href="/dashboard"
            className="text-indigo-300 underline hover:text-indigo-200 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded px-1"
          >
            ← Back to dashboard
          </a>
        </p>

        {data && (
          <div className="mt-3">
            <TrialBanner lifecycle_state={data.lifecycle_state} />
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-50/10 text-rose-200 px-3 py-2">
            {error}
          </p>
        )}

        {isTestMode && (
          <div className="mt-4 rounded-2xl border border-amber-300/40
                          bg-gradient-to-b from-amber-50/10 to-amber-100/10
                          text-amber-100 px-4 py-3 backdrop-blur">
            <p className="font-semibold">Test Mode: Use Stripe test cards</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-100/90">
              <li><span className="font-semibold">Success:</span> 4242 4242 4242 4242</li>
              <li><span className="font-semibold">Any future date:</span> Use any future expiry date</li>
              <li><span className="font-semibold">CVC:</span> Any 3 digits (e.g., 123)</li>
              <li><span className="font-semibold">ZIP:</span> Any 5 digits (e.g., 12345)</li>
            </ul>
          </div>
        )}

        {!data ? (
          <p className="mt-6 text-slate-300">Loading...</p>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl shadow-slate-900/30 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-300">Plan</p>
                <p className="text-lg font-semibold text-white">{data.plan}</p>
              </div>
              <div>
                <p className="text-slate-300">Status</p>
                <p className="text-lg font-semibold text-white">{data.status}</p>
              </div>
              <div>
                <p className="text-slate-300">Period end</p>
                <p className="text-lg font-semibold text-white">
                  {data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-300">Seats</p>
                <p className="text-lg font-semibold text-white">
                  {data.seats.used} / {data.seats.entitled}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-300">Storage</p>
                <p className="text-lg font-semibold text-white">
                  {Math.round((data.storage.usedGB || 0) * 10) / 10} GB / {data.storage.entitledGB} GB
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={onPortal}
                type="button"
                className="rounded-xl px-4 py-2 font-semibold text-white
                           bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 bg-[length:200%_100%]
                           hover:bg-[position:100%_0%]
                           shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/35
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Manage billing
              </button>
              <button
                onClick={onUpgrade}
                type="button"
                className="rounded-xl px-4 py-2 bg-white/90 text-slate-900 border border-white/20
                           hover:-translate-y-0.5 transition shadow-md hover:shadow-lg
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                Change plan / Add storage
              </button>
            </div>
          </div>
        )}

        <UpgradeModal />
      </div>
    </div>
  );
}
