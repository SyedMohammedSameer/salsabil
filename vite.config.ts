import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    proxy: {
      // Forward Netlify function calls to the netlify dev server (port 8888)
      // so both http://localhost:5173 and http://localhost:8888 work during dev
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'motion-vendor': ['framer-motion'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'ui-vendor': ['sonner', 'vaul', 'cmdk'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['eventemitter3'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/data/**'],
      exclude: ['src/lib/supabase.ts', 'src/lib/database.types.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
})
