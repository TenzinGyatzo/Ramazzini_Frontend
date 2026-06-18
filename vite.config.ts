import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

import { readProductVersionFromChangelog } from './scripts/readProductVersion'

const changelogPath = fileURLToPath(
  new URL('../backend/CHANGELOG.md', import.meta.url),
)
const appVersion = readProductVersionFromChangelog(changelogPath)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
  // Dev: mismo origen (5173) → cookies HttpOnly; el proxy reenvía al backend :3000
    proxy: {
      '/auth': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/informes': 'http://localhost:3000',
      '/document-merger': 'http://localhost:3000',
      '/proveedores-salud': 'http://localhost:3000',
      '/pagos': 'http://localhost:3000',
      '/medicos-firmantes': 'http://localhost:3000',
      '/enfermeras-firmantes': 'http://localhost:3000',
      '/tecnicos-firmantes': 'http://localhost:3000',
      '/riesgos-trabajo': 'http://localhost:3000',
      '/assets': 'http://localhost:3000',
      '/expedientes-medicos': 'http://localhost:3000',
    },
  },
})
