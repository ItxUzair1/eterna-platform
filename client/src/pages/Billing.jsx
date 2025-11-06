import React, { useEffect, useState } from 'react';
import http from '../services/api';
import UpgradeModal from '../billing/UpgradeModal';
import TrialBanner from '../components/banners/TrialBanner';

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

  const onUpgrade = async () => {
    try {
      const res = await http.post('/billing/checkout/start', { plan: 'individual', seats: 1, addons: { storageGB: 0 } });
      window.location = res.data.url;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to start checkout';
      alert(`Error: ${msg}`);
      console.error('Checkout error:', e.response?.data || e);
    }
  };

  const isTestMode = window.location.hostname === 'localhost' || import.meta.env.DEV;

  return (
    <div style={{ padding: 16 }}>
      <h1>Billing</h1>
      {data && <TrialBanner lifecycle_state={data.lifecycle_state} />}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isTestMode && (
        <div style={{ background: '#FFF4E5', border: '1px solid #FFD8A8', padding: 12, marginBottom: 12, borderRadius: 4 }}>
          <strong>Test Mode:</strong> Use Stripe test cards:
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li><strong>Success:</strong> 4242 4242 4242 4242</li>
            <li><strong>Any future date:</strong> Use any future expiry date</li>
            <li><strong>CVC:</strong> Any 3 digits (e.g., 123)</li>
            <li><strong>ZIP:</strong> Any 5 digits (e.g., 12345)</li>
          </ul>
        </div>
      )}
      {!data ? <p>Loading...</p> : (
        <div>
          <p>Plan: <strong>{data.plan}</strong></p>
          <p>Status: <strong>{data.status}</strong></p>
          <p>Period end: <strong>{data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleString() : '-'}</strong></p>
          <p>Seats: <strong>{data.seats.used}</strong> / <strong>{data.seats.entitled}</strong></p>
          <p>Storage: <strong>{Math.round((data.storage.usedGB || 0) * 10) / 10} GB</strong> / <strong>{data.storage.entitledGB} GB</strong></p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={onPortal}>Manage billing</button>
            <button onClick={onUpgrade}>Change plan / Add storage</button>
          </div>
        </div>
      )}
      <UpgradeModal />
    </div>
  );
}


