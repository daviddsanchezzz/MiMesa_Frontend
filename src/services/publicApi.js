import axios from 'axios';

// In dev, use relative URL so Vite proxy forwards to localhost:5000
// In production, use the full backend URL directly
const BASE_URL = import.meta.env.DEV
  ? '/api'
  : 'https://mimesa-backend.onrender.com/api';

const publicApi = axios.create({ baseURL: BASE_URL });

export default publicApi;
