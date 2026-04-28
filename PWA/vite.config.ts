import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiSimulatorPort = Number(process.env.E2E_SIM_PORT ?? process.env.PORT ?? 8787)
const gatewayUrl = process.env.VITE_GATEWAY_URL
const proxyToMonitoringApi = gatewayUrl || process.env.E2E_SIM_PORT

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Avoid full reload when e2e writes HTML under PWA/ (Vite root).
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**'],
    },
    // Playwright webServer probes 127.0.0.1; default "localhost" can be IPv6-only.
    ...(process.env.E2E_SIM_PORT ? { host: '127.0.0.1' as const } : {}),
    ...(proxyToMonitoringApi
      ? {
          proxy: gatewayUrl
            ? {
                '/api': {
                  target: gatewayUrl,
                  changeOrigin: true,
                },
              }
            : {
                '/api': {
                  target: `http://127.0.0.1:${apiSimulatorPort}`,
                  changeOrigin: true,
                },
              },
        }
      : {}),
  },
})
