/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fun-building/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
