import React from 'react';
import useBillingStore from '../../store/billingStore';

export default function TrialBanner({ lifecycle_state }) {
  const openUpgradeModal = useBillingStore(s => s.openUpgradeModal);
  if (!lifecycle_state || (lifecycle_state !== 'trial_expired' && lifecycle_state !== 'pending_deletion')) return null;
  const text = lifecycle_state === 'trial_expired'
    ? 'Your trial has ended. Upgrade to continue.'
    : 'Workspace will be deleted soon. Upgrade to keep access.';
  return (
    <div role="region" aria-live="polite" style={{ background: '#FFF4E5', border: '1px solid #FFD8A8', padding: 12, marginBottom: 12 }}>
      <span>{text}</span>
      <button style={{ marginLeft: 12 }} onClick={() => openUpgradeModal({ code: 'TRIAL_EXPIRED', attemptedAction: 'banner_cta' })}>Upgrade</button>
    </div>
  );
}


