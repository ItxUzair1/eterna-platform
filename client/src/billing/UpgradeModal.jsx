import React, { useEffect, useRef, useCallback } from 'react';
import useBillingStore from '../store/billingStore';
import http, { setUpgradeHandler } from '../services/api';

export default function UpgradeModal() {
  const { upgradeOpen, code, selection, setSelection, closeUpgradeModal } = useBillingStore();

  useEffect(() => {
    setUpgradeHandler(({ code, attemptedAction }) => {
      useBillingStore.setState({ upgradeOpen: true, code, attemptedAction });
    });
  }, []);

  // Focus trap (lightweight)
  const dialogRef = useRef(null);
  const prevFocused = useRef(null);

  const trapFocus = useCallback((e) => {
    if (!dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!upgradeOpen) return;
    prevFocused.current = document.activeElement;
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector('[data-autofocus]')?.focus();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeUpgradeModal(); }
      else { trapFocus(e); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      prevFocused.current?.focus?.();
    };
  }, [upgradeOpen, trapFocus, closeUpgradeModal]);

  if (!upgradeOpen) return null;

  const startCheckout = async () => {
    const res = await http.post('/billing/checkout/start', {
      plan: selection.plan,
      seats: selection.seats,
      addons: { storageGB: selection.storageGB },
    });
    window.location = res.data.url;
  };

  const openPortal = async () => {
    const res = await http.post('/billing/portal', {});
    window.location = res.data.url;
  };

  const PlanButton = ({ value, label }) => {
    const active = selection.plan === value;
    return (
      <button
        type="button"
        onClick={() => setSelection({ plan: value })}
        aria-pressed={active}
        className={[
          'relative rounded-full px-3.5 py-2 text-sm font-medium transition',
          'text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500',
          'bg-[length:200%_100%] hover:bg-[position:100%_0%]',
          'shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
          active ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-500' : ''
        ].join(' ')}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm
                   bg-[radial-gradient(1200px_600px_at_10%_10%,rgba(99,102,241,.25),transparent_60%),radial-gradient(1200px_600px_at_90%_90%,rgba(168,85,247,.25),transparent_60%)]"
        onClick={closeUpgradeModal}
        aria-hidden="true"
      />

      {/* Dialog */}
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="upgrade-title"
  aria-describedby="upgrade-desc"
  ref={dialogRef}
  className="fixed z-50 left-1/2 top-14 -translate-x-1/2
             w-[min(880px,calc(100vw-32px))]
             overflow-y-auto max-h-[80vh]
             rounded-2xl border border-slate-200 bg-white
             shadow-2xl animate-[modal-pop_220ms_cubic-bezier(.2,.8,.2,1)_forwards] opacity-0"
  onClick={(e) => e.stopPropagation()}
  data-open="true"
>
  {/* Top gradient bar */}
  <div className="relative">
    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-[length:200%_100%] animate-[hueSlide_6s_linear_infinite]" />
    <div className="px-6 py-4">
      <h2 id="upgrade-title" className="text-slate-900 font-bold tracking-tight text-lg">
        Upgrade Plan
      </h2>
    </div>
  </div>

  {/* Modal Body */}
  <div className="px-6 pb-24">
    <p id="upgrade-desc" className="text-slate-600">
      Choose a plan and optional storage add-on, then proceed to checkout. Your access updates automatically after payment.
    </p>

    {code === 'UPGRADE_REQUIRED' && (
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
        This feature requires upgrading your plan. Please upgrade to access this app.
      </p>
    )}
    {code === 'OVER_QUOTA' && (
      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2">
        <strong>Storage limit reached!</strong> You've used all your available storage. Please upgrade your plan or add storage to continue uploading files.
      </p>
    )}
    {code && code !== 'UPGRADE_REQUIRED' && code !== 'OVER_QUOTA' && (
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
        Reason: {code}
      </p>
    )}

    {/* Plan selector buttons */}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plan">
        <PlanButton value="individual" label="Individual ($15/mo)" />
        <PlanButton value="enterprise_unlimited" label="Enterprise ($1000/mo)" />
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2">
        <span className="text-slate-800">Storage add-on (GB):</span>
        <input
          type="number"
          min="0"
          value={selection.storageGB}
          onChange={(e) => setSelection({ storageGB: Number(e.target.value) })}
          inputMode="numeric"
          className="w-28 rounded-lg border border-slate-300 px-2 py-1 outline-none
                     focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
        />
      </label>
    </div>

    {/* Plan cards */}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {/* Individual Card */}
      <div
        className={[
          'rounded-2xl border p-5 transition shadow-sm',
          selection.plan === 'individual'
            ? 'border-indigo-300 ring-1 ring-indigo-300'
            : 'border-slate-200'
        ].join(' ')}
        role="button"
        tabIndex={0}
        onClick={() => setSelection({ plan: 'individual' })}
        onKeyDown={(e) => e.key === 'Enter' && setSelection({ plan: 'individual' })}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Individual</h3>
            <p className="text-sm text-slate-600">Great for solo work and creators.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">
            $15/mo
          </span>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>Access to CRM, Email, and Kanban apps</li>
          <li>Core features and automations</li>
          <li>Optional storage add-on</li>
        </ul>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSelection({ plan: 'individual' })}
            className="w-full rounded-xl px-4 py-2 text-white font-semibold
                       bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500
                       hover:from-indigo-600 hover:via-blue-600 hover:to-violet-600
                       shadow-md hover:shadow-lg transition focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Choose Individual
          </button>
        </div>
      </div>

      {/* Enterprise Card */}
      <div
        className={[
          'rounded-2xl border p-5 transition shadow-sm',
          selection.plan === 'enterprise_unlimited'
            ? 'border-violet-300 ring-1 ring-violet-300'
            : 'border-slate-200'
        ].join(' ')}
        role="button"
        tabIndex={0}
        onClick={() => setSelection({ plan: 'enterprise_unlimited' })}
        onKeyDown={(e) => e.key === 'Enter' && setSelection({ plan: 'enterprise_unlimited' })}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Enterprise</h3>
            <p className="text-sm text-slate-600">Complete access and control at scale.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">
            $1000/mo
          </span>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>Access to all apps</li>
          <li>Admin access and controls</li>
          <li>Invite members up to 999</li>
          <li>Create teams and assign permissions</li>
          <li>More storage included</li>
        </ul>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setSelection({ plan: 'enterprise_unlimited' })}
            className="w-full rounded-xl px-4 py-2 text-white font-semibold
                       bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500
                       hover:from-indigo-600 hover:via-blue-600 hover:to-violet-600
                       shadow-md hover:shadow-lg transition focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Choose Enterprise
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Footer actions */}
  <div className="px-6 pb-5 pt-3">
    <div
      className="sticky bottom-0 left-0 right-0 -mx-6 px-6 py-3
                 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80
                 border-t border-slate-200"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startCheckout}
          data-autofocus
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-white font-semibold
                     bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600
                     hover:from-indigo-700 hover:via-blue-700 hover:to-violet-700
                     shadow-md hover:shadow-lg transition focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Start Checkout
        </button>

        <button
          type="button"
          onClick={openPortal}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2
                     text-slate-900 bg-white border border-slate-300
                     hover:bg-slate-50 transition shadow-sm hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Manage billing
        </button>

        <button
          type="button"
          onClick={closeUpgradeModal}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2
                     text-slate-700 bg-slate-100 border border-slate-300
                     hover:bg-slate-200 transition shadow-sm hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>


      {/* Animations */}
      <style>
        {`
          @keyframes hueSlide { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
          @keyframes modal-pop { to { transform: none; opacity: 1; } }
        `}
      </style>
    </>
  );
}
