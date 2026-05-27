import axios from 'axios';

// In dev, use relative URL so Vite proxy forwards to localhost:5000
// In production, use the full backend URL directly
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://api.vetrareserve.com').replace(/\/api\/?$/, '');
const BASE_URL = import.meta.env.DEV
  ? '/api'
  : `${API_ORIGIN}/api`;

const publicApi = axios.create({ baseURL: BASE_URL });

export default publicApi;
