import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@linera/client', '@linera/signer'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'linera': ['@linera/client', '@linera/signer'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
