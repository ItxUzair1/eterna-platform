import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import http from '../services/api';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('confirming');
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // Confirm the checkout session
      http.post('/billing/checkout/confirm', { sessionId })
        .then((res) => {
          if (res.data.ok) {
            setStatus('success');
            // Redirect to billing page after 3 seconds
            setTimeout(() => navigate('/billing'), 3000);
          } else {
            setStatus('error');
            setError('Failed to confirm subscription');
          }
        })
        .catch((e) => {
          setStatus('error');
          setError(e?.response?.data?.error || e.message || 'Failed to confirm subscription');
        });
    } else {
      // No session_id - payment might have succeeded but Stripe didn't pass it
      // Show success message anyway and let user check billing page
      setStatus('success');
      console.warn('No session_id in URL - payment may have succeeded. Check billing page.');
      setTimeout(() => navigate('/billing'), 3000);
    }
  }, [searchParams, navigate]);

  if (status === 'confirming') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Processing your payment...</h1>
        <p>Please wait while we confirm your subscription.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ color: '#DC2626' }}>Payment Confirmation Error</h1>
        <p style={{ color: '#DC2626' }}>{error}</p>
        <div style={{ marginTop: 20 }}>
          <button onClick={() => navigate('/billing')} style={{ padding: '10px 20px', marginRight: 10 }}>
            Back to Billing
          </button>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, color: '#10B981', marginBottom: 20 }}>✓</div>
      <h1 style={{ color: '#10B981' }}>Payment Successful!</h1>
      <p>Your subscription has been activated. You will be redirected to the billing page shortly.</p>
      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate('/billing')} style={{ padding: '10px 20px' }}>
          Go to Billing Page
        </button>
      </div>
    </div>
  );
}

