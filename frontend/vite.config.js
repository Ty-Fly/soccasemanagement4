import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// De dev-server stuurt /api en /hubs door naar de .NET-backend.
// Zo heeft de backend (nog) geen CORS-configuratie nodig.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'https://localhost:7181'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true, secure: false },
        '/hubs': { target: backend, changeOrigin: true, secure: false, ws: true },
      },
    },
  }
})
