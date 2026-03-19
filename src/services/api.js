import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'https://mimesa-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends Better Auth session cookie on every request
});

// ── 401 handler ──────────────────────────────────────────────────────────────
// If the session is invalid or expired, dispatch logout event so AuthContext
// can clear state and redirect to login.
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
