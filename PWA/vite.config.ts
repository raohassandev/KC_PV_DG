import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiSimulatorPort = Number(
  process.env.E2E_SIM_PORT ?? process.env.PORT ?? 8787,
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Playwright webServer probes 127.0.0.1; default "localhost" can be IPv6-only.
    ...(process.env.E2E_SIM_PORT ? { host: '127.0.0.1' as const } : {}),
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiSimulatorPort}`,
        changeOrigin: true,
      },
    },
  },
})
