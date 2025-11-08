import React, { useEffect, useState } from 'react';
import http from '../services/api';
import UpgradeModal from '../billing/UpgradeModal';
import TrialBanner from '../components/banners/TrialBanner';
import useBillingStore from '../store/billingStore';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import { showError } from '../utils/toast';

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
        showError(`Error: ${msg}`);
      }
      console.error('Portal error:', e.response?.data || e);
    }
  };

  const onUpgrade = () => {
    useBillingStore.getState().openUpgradeModal({ code: 'UPGRADE_CLICK', attemptedAction: 'billing_change_plan' });
  };

  const isTestMode = window.location.hostname === 'localhost' || import.meta.env.DEV;

  return (
    <PageContainer>
      <div className="min-h-[calc(100vh-6rem)] bg-white">
        <PageHeader
          title="Billing"
          description="Manage your subscription, payment methods, and billing information"
          actions={
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
            >
              ← Back to dashboard
            </a>
          }
        />

        {data && (
          <div className="mt-3">
            <TrialBanner lifecycle_state={data.lifecycle_state} />
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
            {error}
          </p>
        )}

        {isTestMode && (
          <div
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3"
          >
            <p className="font-semibold">Test Mode: Use Stripe test cards</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">Success:</span> 4242 4242 4242 4242</li>
              <li><span className="font-semibold">Any future date:</span> Use any future expiry date</li>
              <li><span className="font-semibold">CVC:</span> Any 3 digits (e.g., 123)</li>
              <li><span className="font-semibold">ZIP:</span> Any 5 digits (e.g., 12345)</li>
            </ul>
          </div>
        )}

        {!data ? (
          <p className="mt-6 text-slate-500">Loading...</p>
        ) : (
          <div className="mt-6">
            {/* Summary card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-slate-500">Plan</p>
                  <p className="text-lg font-semibold text-slate-900">{data.plan}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-slate-500">Status</p>
                  <p className="text-lg font-semibold text-slate-900">{data.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-slate-500">Period end</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleString() : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-slate-500">Seats</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {data.seats.used} / {data.seats.entitled}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2 lg:col-span-2">
                  <p className="text-slate-500">Storage</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {Math.round((data.storage.usedGB || 0) * 10) / 10} GB / {data.storage.entitledGB} GB
                  </p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((data.storage.usedGB || 0) / (data.storage.entitledGB || 1)) * 100
                        ).toFixed(2)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={onPortal}
                  type="button"
                  className="rounded-xl px-4 py-2 font-semibold text-white
                             bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500
                             hover:from-indigo-600 hover:via-blue-600 hover:to-violet-600
                             shadow-md hover:shadow-lg transition focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  Manage billing
                </button>
                <button
                  onClick={onUpgrade}
                  type="button"
                  className="rounded-xl px-4 py-2 border border-slate-200 bg-white text-slate-900
                             hover:bg-slate-50 transition shadow-sm hover:shadow-md
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  Change plan / Add storage
                </button>
              </div>
            </div>

            {/* Helpful notes card (optional, responsive) */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Invoices & receipts</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Access your billing history and download invoices from the customer portal after connecting Stripe. 
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Seat management</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Add or remove seats from your plan as your team grows; prorations apply based on Stripe settings.
                </p>
              </div>
            </div>
          </div>
        )}

        <UpgradeModal />
      </div>
    </PageContainer>
  );
}
