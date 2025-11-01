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
      // Check if user has access token
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setUser(null);
        setEnabledApps([]);
        setPermissions({});
        setError('No access token');
        setLoading(false);
        return;
      }

      const [meRes, appsRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/permissions/me/apps')
      ]);
      
      // Handle /auth/me response
      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.data.user || null);
      } else {
        console.warn('Failed to fetch user:', meRes.reason?.response?.data?.error || meRes.reason?.message);
        setUser(null);
      }

      // Handle /permissions/me/apps response
      if (appsRes.status === 'fulfilled') {
        setEnabledApps(appsRes.value.data.apps || []);
        setPermissions(appsRes.value.data.perms || {});
      } else {
        console.warn('Failed to fetch apps/permissions:', appsRes.reason?.response?.data?.error || appsRes.reason?.message);
        // If permissions endpoint fails, set empty defaults but don't fail completely
        setEnabledApps([]);
        setPermissions({});
      }
    } catch (e) {
      console.error('Auth refresh error:', e);
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