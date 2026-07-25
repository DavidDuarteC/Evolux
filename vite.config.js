import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'vite_'],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
})