import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Lofi Radio',
        short_name: 'LofiRadio',
        description:
          'Radio lofi offline: le tue tracce locali con suoni ambientali sintetizzati (pioggia, fuoco, caffetteria, vinile) e timer Pomodoro.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1021',
        theme_color: '#0d1021',
        categories: ['music', 'productivity'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache dell'intera app shell: dopo il primo caricamento
        // l'app funziona completamente offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Strategia cache-first per gli asset statici della nostra origine:
        // nessuna richiesta di rete se la risorsa è già in cache. Limitato
        // esplicitamente a self.location.origin per non intercettare/
        // conservare risorse di terze parti (es. player IFrame di YouTube).
        runtimeCaching: [
          {
            // Nota: questa funzione viene eseguita nel service worker a
            // runtime (dove `self` è lo ServiceWorkerGlobalScope), ma
            // vite.config.ts viene type-checked con la lib di Node, che non
            // dichiara `self` — da qui il cast tramite globalThis.
            urlPattern: ({ request, url }) =>
              url.origin ===
                (globalThis as unknown as { location: { origin: string } }).location.origin &&
              ['style', 'script', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
