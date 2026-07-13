import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: frontend calls /api on :5173 → Vite forwards to backend :8000.
// Works for localhost AND teammates on your LAN (no hardcoded 127.0.0.1).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
