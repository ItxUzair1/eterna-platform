// client/src/services/api.js
import axios from 'axios';

// Simple pub/sub for upgrade modal trigger
let onUpgradeNeeded = null;
export function setUpgradeHandler(fn) { onUpgradeNeeded = fn; }

export const http = axios.create({ withCredentials: true });
http.defaults.baseURL = import.meta.env.VITE_API_URL;

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 403 && error?.response?.data?.code) {
      const code = error.response.data.code;
      const attemptedAction = error.config?.url || 'unknown';
      if (onUpgradeNeeded) onUpgradeNeeded({ code, attemptedAction });
    }
    return Promise.reject(error);
  }
);

export default http;

let isRefreshing = false;
let queue = [];

function setAuthHeader(token) {
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete http.defaults.headers.common.Authorization;
}

export function loadAuth() {
  const at = localStorage.getItem('accessToken');
  setAuthHeader(at);
}

http.interceptors.request.use((config) => {
  const at = localStorage.getItem('accessToken');
  if (at) config.headers.Authorization = `Bearer ${at}`;
  // Don't override Content-Type for FormData - let axios set it automatically with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    // Handle 403 errors (plan restrictions) - don't retry, just log
    if (error?.response?.status === 403 && error?.response?.data?.code === 'ENTERPRISE_PLAN_REQUIRED') {
      console.warn('[API] Enterprise plan required:', error.response.data.detail);
      // Don't retry 403 errors, they're permanent for this plan
      return Promise.reject(error);
    }

    // Handle 401 errors that need token refresh
    if (error?.response?.status === 401 && 
        !original._retry && 
        !original.url.startsWith('/auth/')) { // Better way to check auth endpoints
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token, clear auth and redirect
        localStorage.removeItem('accessToken');
        setAuthHeader(null);
        // Don't redirect if already on auth pages
        const pathname = window.location.pathname;
        const isAuthPage = pathname.includes('/login') || 
                          pathname.includes('/register') || 
                          pathname.includes('/verify-email') || 
                          pathname.includes('/forgot-password') || 
                          pathname.includes('/reset-password') ||
                          pathname.includes('/accept-invite');
        if (!isAuthPage) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Prevent multiple simultaneous refresh attempts
      if (isRefreshing) {
        try {
          const token = await new Promise((resolve, reject) => {
            queue.push({ resolve, reject });
          });
          original.headers.Authorization = `Bearer ${token}`;
          return http(original);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Use a new axios instance to avoid interceptors
        const resp = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken, refreshToken: newRefreshToken } = resp.data;

        // Update stored tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        setAuthHeader(accessToken);

        // Retry queued requests
        queue.forEach(p => p.resolve(accessToken));
        queue = [];

        // Retry original request
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch (e) {
        // Clear auth state on refresh failure
        queue.forEach(p => p.reject(e));
        queue = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthHeader(null);
        
        // Only redirect to login if not already on auth pages
        const pathname = window.location.pathname;
        const isAuthPage = pathname.includes('/login') || 
                          pathname.includes('/register') || 
                          pathname.includes('/verify-email') || 
                          pathname.includes('/forgot-password') || 
                          pathname.includes('/reset-password') ||
                          pathname.includes('/accept-invite');
        if (!isAuthPage) {
          window.location.href = '/login';
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

