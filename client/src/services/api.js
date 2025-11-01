// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let isRefreshing = false;
let queue = [];

function setAuthHeader(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function loadAuth() {
  const at = localStorage.getItem('accessToken');
  setAuthHeader(at);
}

api.interceptors.request.use((config) => {
  const at = localStorage.getItem('accessToken');
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    // Handle 401 errors that need token refresh
    if (error?.response?.status === 401 && 
        !original._retry && 
        !original.url.startsWith('/auth/')) { // Better way to check auth endpoints
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token, clear auth and redirect
        localStorage.removeItem('accessToken');
        setAuthHeader(null);
        if (!window.location.pathname.includes('/login')) {
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
          return api(original);
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
        return api(original);
      } catch (e) {
        // Clear auth state on refresh failure
        queue.forEach(p => p.reject(e));
        queue = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthHeader(null);
        
        // Only redirect to login if not already on auth pages
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup')) {
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

export default api;
