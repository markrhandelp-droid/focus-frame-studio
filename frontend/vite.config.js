import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // Firebase + React-Bootstrap make one ~520 kB bundle (~160 kB gzipped).
    chunkSizeWarningLimit: 800,
  },
})
