import React, { useEffect } from 'react';
import useBillingStore from '../store/billingStore';
import http, { setUpgradeHandler } from '../services/api';

export default function UpgradeModal() {
  const { upgradeOpen, code, selection, setSelection, closeUpgradeModal } = useBillingStore();

  useEffect(() => {
    setUpgradeHandler(({ code, attemptedAction }) => {
      useBillingStore.setState({ upgradeOpen: true, code, attemptedAction });
    });
  }, []);

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

  const PlanButton = ({ value, label }) => (
    <button
      onClick={() => setSelection({ plan: value })}
      aria-pressed={selection.plan === value}
      style={{ marginRight: 8, padding: '8px 12px', border: selection.plan === value ? '2px solid #4F46E5' : '1px solid #CCC' }}
    >{label}</button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Upgrade" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: '#fff', width: 640, margin: '10vh auto', padding: 20 }}>
        <h2>Upgrade</h2>
        {code && <p style={{ color: '#B45309' }}>Reason: {code}</p>}
        <div style={{ marginBottom: 12 }}>
          <PlanButton value="individual" label="Individual ($15/mo)" />
          <PlanButton value="enterprise_seats" label="Enterprise Seats ($30/seat/mo)" />
          <PlanButton value="enterprise_unlimited" label="Enterprise Unlimited ($1000/mo)" />
        </div>
        {selection.plan === 'enterprise_seats' && (
          <div style={{ marginBottom: 12 }}>
            <label>Seats:&nbsp;<input type="number" min="1" value={selection.seats} onChange={(e) => setSelection({ seats: Number(e.target.value) })} /></label>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label>Storage add-on (GB):&nbsp;<input type="number" min="0" value={selection.storageGB} onChange={(e) => setSelection({ storageGB: Number(e.target.value) })} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startCheckout}>Start Checkout</button>
          <button onClick={openPortal}>Manage billing</button>
          <button onClick={closeUpgradeModal}>Close</button>
        </div>
        <p style={{ marginTop: 12, color: '#555' }}>After payment, your access updates automatically.</p>
      </div>
    </div>
  );
}


