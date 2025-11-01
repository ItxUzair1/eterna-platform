// src/features/auth/AuthContext.js
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [enabledApps, setEnabledApps] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, appsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/permissions/me/apps')
      ]);
      setUser(meRes.data.user || null);
      setEnabledApps(appsRes.data.apps || []);
      setPermissions(appsRes.data.perms || {});
    } catch (e) {
      setUser(null);
      setEnabledApps([]);
      setPermissions({});
      setError(e?.response?.data?.error || 'Unauthenticated');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial bootstrap
  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  // Signout helper (optional)
  const signout = useCallback(() => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch {}
    setUser(null);
    setEnabledApps([]);
    setPermissions({});
  }, []);

  const value = useMemo(() => ({
    user,
    enabledApps,
    permissions,
    loading,
    error,
    refreshAuth,
    signout
  }), [user, enabledApps, permissions, loading, error, refreshAuth, signout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};