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
        className="fixed inset-0 z-40
                   bg-slate-950/70 backdrop-blur-sm
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
                   w-[min(720px,calc(100vw-32px))] overflow-hidden
                   rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl
                   shadow-2xl shadow-slate-900/35
                   animate-[modal-pop_220ms_cubic-bezier(.2,.8,.2,1)_forwards] opacity-0"
        onClick={(e) => e.stopPropagation()}
        data-open="true"
      >
        {/* Animated gradient top bar */}
        <div className="relative">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-[length:200%_100%] animate-[hueSlide_6s_linear_infinite]" />
          <div className="px-6 py-4">
            <h2 id="upgrade-title" className="text-slate-900 font-bold tracking-tight text-lg">
              Upgrade Plan
            </h2>
          </div>
        </div>

        <div className="px-6 pb-2">
          <p id="upgrade-desc" className="text-slate-600">
            Choose a plan and optional storage add-on, then proceed to checkout. Your access updates automatically after payment.
          </p>

          {code === 'UPGRADE_REQUIRED' && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800 px-3 py-2">
              This feature requires upgrading your plan. Please upgrade to access this app.
            </p>
          )}
          {code && code !== 'UPGRADE_REQUIRED' && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800 px-3 py-2">
              Reason: {code}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plan">
              <PlanButton value="individual" label="Individual ($15/mo)" />
              <PlanButton value="enterprise_unlimited" label="Enterprise ($1000/mo)" />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-900/10 bg-gradient-to-b from-white to-slate-50 px-3 py-2">
              <span className="text-slate-800">Storage add-on (GB):</span>
              <input
                type="number"
                min="0"
                value={selection.storageGB}
                onChange={(e) => setSelection({ storageGB: Number(e.target.value) })}
                inputMode="numeric"
                className="w-28 rounded-lg border border-slate-900/15 px-2 py-1 outline-none
                           focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
              />
            </label>
          </div>
        </div>

        <div className="px-6 pb-5 pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startCheckout}
            data-autofocus
            className="relative rounded-xl px-4 py-2 text-white font-semibold
                       bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 bg-[length:200%_100%]
                       hover:bg-[position:100%_0%]
                       shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/35
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Start Checkout
          </button>
          <button
            type="button"
            onClick={openPortal}
            className="rounded-xl px-4 py-2 bg-white text-slate-900 border border-slate-900/15
                       hover:-translate-y-0.5 transition shadow-md hover:shadow-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Manage billing
          </button>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="rounded-xl px-4 py-2 bg-white text-slate-900 border border-slate-900/15
                       hover:-translate-y-0.5 transition shadow-md hover:shadow-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Close
          </button>
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
