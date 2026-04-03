import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3100,
    proxy: {
      '/api': 'http://127.0.0.1:37799',
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../plugin/ui'),
    emptyOutDir: true,
  },
})
