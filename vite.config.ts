import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    hmr: {
      clientPort: 8888,
    },
  },
  resolve: {
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
    include: ['pixi.js', 'eventemitter3', 'framer-motion'],
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
