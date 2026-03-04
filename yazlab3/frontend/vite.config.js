import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Dosya değişikliklerini daha kararlı takip et
    },
    host: true, // Network üzerinden erişime izin ver
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['js-big-decimal'] // Gereksiz optimizasyonları atla
  }
})