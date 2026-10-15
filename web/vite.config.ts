import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The CipherPay demo backend (server/index.ts) handles /api.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
