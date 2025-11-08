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
    useBillingStore.getState().openUpgradeModal({ 
      code: 'UPGRADE_CLICK', 
      attemptedAction: 'billing_change_plan' 
    });
  };

  const isTestMode = window.location.hostname === 'localhost' || import.meta.env.DEV;

  // Calculate usage percentages
  const seatsPercentage = data ? (data.seats.used / data.seats.entitled) * 100 : 0;
  const storagePercentage = data ? ((data.storage.usedGB || 0) / data.storage.entitledGB) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <span className="text-indigo-300 font-bold text-lg">∞</span>
                </div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  Billing & Subscription
                </h1>
              </div>
              <p className="text-slate-300 text-sm ml-[52px]">
                Manage your subscription, payment methods, and billing information
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition shadow-lg shadow-indigo-900/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to dashboard
            </a>
          </div>
        </div>

        {/* Trial Banner */}
        {data && (
          <div className="mb-6">
            <TrialBanner lifecycle_state={data.lifecycle_state} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-400/30 bg-gradient-to-r from-rose-500/10 to-red-500/10 backdrop-blur-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-rose-300 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-rose-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Test Mode Banner */}
        {isTestMode && (
          <div className="mb-6 relative rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-amber-100 font-semibold mb-2">Test Mode: Use Stripe test cards</p>
                <ul className="space-y-1.5 text-sm text-amber-100/90">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-300 mt-0.5">•</span>
                    <span><strong className="font-medium">Success:</strong> 4242 4242 4242 4242</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-300 mt-0.5">•</span>
                    <span><strong className="font-medium">Expiry:</strong> Any future date (e.g., 12/28)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-300 mt-0.5">•</span>
                    <span><strong className="font-medium">CVC:</strong> Any 3 digits (e.g., 123)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-300 mt-0.5">•</span>
                    <span><strong className="font-medium">ZIP:</strong> Any 5 digits (e.g., 12345)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!data ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              <p className="text-slate-300">Loading billing information...</p>
            </div>
          </div>
        ) : (
          /* Main Billing Card */
          <div className="relative rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl shadow-slate-900/50 overflow-hidden">
            
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10"></div>
            
            <div className="relative p-8">
              
              {/* Subscription Overview */}
              <div className="mb-8">
                <h2 className="text-white text-xl font-semibold mb-1 flex items-center gap-2">
                  <svg className="h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Current Subscription
                </h2>
                <p className="text-slate-400 text-sm">Your plan details and usage</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                
                {/* Plan */}
                <div className="relative group">
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 transition hover:bg-slate-900/60 hover:border-white/20">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-400 text-sm font-medium">Plan</p>
                      <svg className="h-4 w-4 text-indigo-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                      </svg>
                    </div>
                    <p className="text-white text-2xl font-semibold capitalize">{data.plan}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="relative group">
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 transition hover:bg-slate-900/60 hover:border-white/20">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-400 text-sm font-medium">Status</p>
                      <svg className="h-4 w-4 text-green-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <p className="text-white text-2xl font-semibold capitalize">{data.status}</p>
                    {data.status === 'active' && (
                      <div className="inline-flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-green-300 text-xs">Auto-renew enabled</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Billing */}
                <div className="relative group sm:col-span-2 lg:col-span-1">
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 transition hover:bg-slate-900/60 hover:border-white/20">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-slate-400 text-sm font-medium">Next Billing</p>
                      <svg className="h-4 w-4 text-cyan-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <p className="text-white text-lg font-semibold">
                      {data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : '-'}
                    </p>
                    {data.currentPeriodEnd && (
                      <p className="text-slate-400 text-xs mt-1">
                        {new Date(data.currentPeriodEnd).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Usage Section */}
              <div className="mb-8">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                  Resource Usage
                </h3>

                <div className="space-y-4">
                  
                  {/* Seats Usage */}
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                          <path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        <span className="text-white font-medium">Team Seats</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold">
                        {data.seats.used} / {data.seats.entitled}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${seatsPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">
                      {data.seats.entitled - data.seats.used} seats available
                    </p>
                  </div>

                  {/* Storage Usage */}
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-cyan-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <span className="text-white font-medium">Storage</span>
                      </div>
                      <span className="text-slate-300 text-sm font-semibold">
                        {Math.round((data.storage.usedGB || 0) * 10) / 10} GB / {data.storage.entitledGB} GB
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${storagePercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-slate-400 text-xs mt-2">
                      {Math.round((data.storage.entitledGB - (data.storage.usedGB || 0)) * 10) / 10} GB remaining
                    </p>
                  </div>

                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-8">
                <div className="h-px flex-1 bg-white/10"></div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Actions</span>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                
                <button
                  onClick={onPortal}
                  type="button"
                  className="flex-1 min-w-[200px] group relative rounded-xl px-6 py-3.5 font-semibold text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 hover:from-cyan-400 hover:via-indigo-400 hover:to-violet-400 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Manage Billing Portal
                  </span>
                </button>

                <button
                  onClick={onUpgrade}
                  type="button"
                  className="flex-1 min-w-[200px] rounded-xl px-6 py-3.5 font-medium text-white border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <polyline points="17 11 19 13 23 9"/>
                    </svg>
                    Change Plan / Add Storage
                  </span>
                </button>

              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-indigo-300 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Need help? Contact our support team or visit the 
                      <a href="#" className="text-indigo-300 hover:text-indigo-200 font-medium transition underline decoration-indigo-300/30 ml-1">
                        billing documentation
                      </a> 
                      {' '}for more information about subscriptions and payments.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-xs">
            🔒 Secure billing • PCI DSS compliant • Powered by Stripe
          </p>
        </div>

      </div>

      <UpgradeModal />
    </div>
  );
}
