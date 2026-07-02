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
        // Strategia cache-first per gli asset statici: nessuna richiesta
        // di rete se la risorsa è già in cache.
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
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
