import axios from 'axios';

const DEFAULT_API_ORIGIN = import.meta.env.DEV ? 'http://localhost:5000' : 'https://api.vetrareserve.com';
const API_ORIGIN = (import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN).replace(/\/api\/?$/, '');
const BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ── Active business context ───────────────────────────────────────────────────
// Set by AuthContext when the user switches between businesses.
// Sent as X-Business-Id header so the backend knows which business to operate on.
// Remembered in the browser so a reload stays in the same business (the backend
// checks membership and falls back to the first business if it no longer applies).
const ACTIVE_BUSINESS_KEY = 'vetra:activeBusinessId';

function readStoredBusinessId() {
  try { return localStorage.getItem(ACTIVE_BUSINESS_KEY) || null; } catch { return null; }
}

let _activeBusinessId = readStoredBusinessId();

export function setActiveBusinessId(id) {
  _activeBusinessId = id ? String(id) : null;
  try {
    if (_activeBusinessId) localStorage.setItem(ACTIVE_BUSINESS_KEY, _activeBusinessId);
    else localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  } catch { /* storage unavailable: keep it in memory only */ }
}

export function getActiveBusinessId() {
  return _activeBusinessId;
}

api.interceptors.request.use(config => {
  if (_activeBusinessId) {
    config.headers['X-Business-Id'] = _activeBusinessId;
  }
  // Send Better Auth session token as Bearer for cross-origin setups
  const token = localStorage.getItem('ba_session_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
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
