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
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const rt = localStorage.getItem('refreshToken');
        if (!rt) throw new Error('No refresh token');

        const resp = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken: rt });
        const { accessToken, refreshToken } = resp.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setAuthHeader(accessToken);

        queue.forEach(p => p.resolve(accessToken));
        queue = [];

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (e) {
        queue.forEach(p => p.reject(e));
        queue = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthHeader(null);
        if (window.location.pathname !== '/') window.location.href = '/';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
