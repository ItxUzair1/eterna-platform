import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made.</p>
      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate('/billing')} style={{ padding: '10px 20px' }}>
          Back to Billing
        </button>
      </div>
    </div>
  );
}

