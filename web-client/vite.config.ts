import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@linera/client'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    // Proxy hub chain queries to local node service
    // This enables serverless marketplace reads without running a separate backend
    proxy: {
      '/api/hub-query': {
        target: 'http://localhost:8880',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract chain and app from env vars (loaded at build time)
          const chainId = 'a6f2e101a65522962a5cc4a422202e3374f9d11215258c88e7496bdaadde9635';
          const appId = '33419b4ba47b1984290c43340a4a6107c47d6ba5cc4612c6a40749d45a85cfc7';
          return `/chains/${chainId}/applications/${appId}`;
        },
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
