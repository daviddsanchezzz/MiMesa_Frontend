import axios from 'axios';
import { clearCache, invalidateAfterWrite } from '../lib/query';

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
  const next = id ? String(id) : null;
  // Another business (or none): nothing cached belongs to it.
  if (next !== _activeBusinessId) clearCache();
  _activeBusinessId = next;
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
  (response) => {
    // Something was saved: what depends on it is stale now (see lib/query).
    const method = (response.config?.method || 'get').toLowerCase();
    if (method !== 'get') invalidateAfterWrite(response.config?.url);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
