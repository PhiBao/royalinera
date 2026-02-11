import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Following official Linera examples: NO vite-plugin-wasm / vite-plugin-top-level-await.
// The SDK handles its own WASM loading via fetch().
export default defineConfig({
  plugins: [
    react(),
  ],
  optimizeDeps: {
    exclude: ['@linera/client'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
