import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Local: the same backend the app talks to (VITE_API_URL), so public pages work too.
      '/api': process.env.VITE_API_URL || 'http://localhost:5000',
    },
  },
});
