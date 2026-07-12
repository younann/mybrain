/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'push-sw.js'],
      workbox: {
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Second Brain',
        short_name: 'Brain',
        description: 'Capture anything; ask your memory in natural language.',
        theme_color: '#4f46e5',
        background_color: '#0f1113',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        // Appear in the OS share sheet; shared text/url lands on /share (GET).
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
