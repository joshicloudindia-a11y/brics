// brics-event-frontend/vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'BRICS India 2026',
        short_name: 'BRICS 2026',
        description: 'Event Management and Accreditation Portal for BRICS India 2026',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/logo1.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo1.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15728640, 
        importScripts: ['/firebase-messaging-sw.js']
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000, 
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: ["devbricsevents.negd.in"],
  },
});