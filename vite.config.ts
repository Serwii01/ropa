import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ropa',
        short_name: 'ropa',
        description: 'Tu armario, en el bolsillo.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Modelo de @imgly/background-removal: se descarga una vez y queda en caché
            urlPattern: /^https:\/\/staticimgly\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'modelo-quitar-fondo',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
})
