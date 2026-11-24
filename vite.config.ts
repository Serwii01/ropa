import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Todo lo VITE_* acaba en el navegador: corta si la clave es secreta en vez de pública. */
function soloClavePublica(): Plugin {
  return {
    name: 'solo-clave-publica',
    config(_config, { mode }) {
      const clave = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_ANON_KEY?.trim() ?? ''
      let rol = ''
      try {
        rol = JSON.parse(Buffer.from(clave.split('.')[1] ?? '', 'base64url').toString()).role
      } catch {
        // no es un JWT
      }
      if (clave.startsWith('sb_secret_') || rol === 'service_role')
        throw new Error('VITE_SUPABASE_ANON_KEY es una clave secreta; usa la publishable (sb_publishable_…) o la anon.')
    },
  }
}

// Con la página aislada el modelo usa varios hilos (mucho más rápido). En producción, en vercel.json.
const aislada = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  worker: { format: 'es' }, // procesa las imágenes y carga el modelo por partes
  server: { headers: aislada },
  preview: { headers: aislada },
  plugins: [
    soloClavePublica(),
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
            // Fotos del armario: nunca cambian, solo el token de su URL, que se quita de la clave.
            // La función se copia tal cual al service worker: no puede usar nada de este archivo.
            urlPattern: /^https?:\/\/[^/]+\/storage\/v1\/object\/sign\/prendas\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-prendas',
              cacheableResponse: { statuses: [200] },
              plugins: [{ cacheKeyWillBeUsed: async ({ request }) => request.url.split('?')[0] }],
            },
          },
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
