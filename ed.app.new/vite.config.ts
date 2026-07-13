import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['icons/icon-72.png', 'icons/icon-96.png', 'icons/icon-128.png', 'icons/icon-144.png', 'icons/icon-152.png', 'icons/icon-192.png', 'icons/icon-384.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Lucid — Dream Journal',
        short_name: 'Lucid',
        description: 'Your personal dream journal with AI analysis, dream visualization, and sleep tracking.',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        categories: ['health', 'lifestyle', 'productivity'],
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.pollinations\.ai\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pollinations-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      // Ollama Image Gen proxy (Brief 1) - allows dev without CORS issues
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js', 'tesseract.js'],
  },
});
