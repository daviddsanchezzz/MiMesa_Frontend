import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'https://mimesa-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ── Active business context ───────────────────────────────────────────────────
// Set by AuthContext when the user switches between businesses.
// Sent as X-Business-Id header so the backend knows which business to operate on.
let _activeBusinessId = null;

export function setActiveBusinessId(id) {
  _activeBusinessId = id || null;
}

api.interceptors.request.use(config => {
  if (_activeBusinessId) {
    config.headers['X-Business-Id'] = _activeBusinessId;
  }
  return config;
});

// ── 401 handler ──────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
