// src/pages/EmailSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMailAccount, updateMailAccount, getMailAccount } from '../services/emailService';
import Button from '../components/Button';
import InputField from '../components/InputField';

export default function EmailSettings() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [formData, setFormData] = useState({
    type: 'SMTP',
    host: '',
    port: 587,
    username: '',
    password: '',
    scope: 'send',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const res = await getMailAccount();
      if (res.data && res.data.id) {
        setAccount(res.data);
        setFormData({
          type: res.data.type || 'SMTP',
          host: res.data.host || '',
          port: res.data.port || 587,
          username: res.data.username || '',
          password: '',
          scope: res.data.scope || 'send',
        });
      } else {
        setAccount(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setAccount(null);
      } else {
        console.error('Failed to load account:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Saving...');
    setLoading(true);
    try {
      if (account) {
        await updateMailAccount(account.id, formData);
        setStatus('✅ SMTP account updated successfully! If you updated the password, it has been re-encrypted.');
      } else {
        if (!formData.password) {
          setStatus('❌ Error: Password is required for new accounts.');
          setLoading(false);
          return;
        }
        await createMailAccount(formData);
        setStatus('✅ SMTP account created successfully!');
      }
      await loadAccount();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setStatus('❌ Error: ' + errorMsg);
      if (errorMsg.includes('Decryption failed')) {
        setStatus('❌ Error: Cannot decrypt existing password. Please enter your password again to re-encrypt it.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top app bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Email Settings</h1>
          <button
            onClick={() => navigate('/dashboard/email')}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Back to Email"
          >
            Back to Email
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Card header */}
          <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100">
            <p className="text-sm text-gray-600">
              Configure your SMTP account to send emails. Update fields below and save changes.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {/* Host + Port */}
              <div className="md:col-span-8">
                <InputField
                  label="SMTP Host"
                  placeholder="smtp.gmail.com"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  required
                />
               
              </div>
              <div className="md:col-span-4">
                <InputField
                  label="Port"
                  type="number"
                  placeholder="587 (TLS) or 465 (SSL)"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
                  required
                />
              </div>

              {/* Username + Password */}
              <div className="md:col-span-6">
                <InputField
                  label="Username (Email Address)"
                  type="email"
                  placeholder="your-email@gmail.com"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
               
              </div>
              <div className="md:col-span-6">
                <InputField
                  label={account ? 'Password (App Password - leave blank to keep current)' : 'Password (App Password) By Clicking on the following link https://support.google.com/accounts/answer/185833?hl=en-GB)'}
                  type="password"
                  placeholder="Enter 16-character app password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!account}
                />
               </div>

              {/* Scope (read-only visual) */}
              <div className="md:col-span-12">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                 </div>
              </div>

              {/* Help */}
              <div className="md:col-span-12">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Gmail Configuration Tips</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Enable 2‑Step Verification and create an App Password (no spaces).</li>
                    <li>Host: smtp.gmail.com · Port: 587 (TLS) or 465 (SSL).</li>
                    <li>Use your Gmail address as Username; ensure the From address is verified if using an alias.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/email')}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm"
                disabled={loading}
              >
                {loading ? 'Saving...' : (account ? 'Update' : 'Create') + ' SMTP Account'}
              </Button>
            </div>

            {/* Status */}
            {status && (
              <div
                className={`mt-4 text-sm font-medium px-4 py-2 rounded-lg ${
                  status.includes('✅')
                    ? 'text-green-700 bg-green-50 border border-green-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {status}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
