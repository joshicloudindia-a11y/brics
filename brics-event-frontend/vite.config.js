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
      devOptions: {
        enabled: true, 
        type: 'classic' 
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'BRICS 2026',
        short_name: 'BRICS 2026',
        description: 'Official Accreditation & Event Management Platform for BRICS India 2026. Manage your itinerary, travel, and sessions.',
        start_url: '/',
        lang: 'en',
        theme_color: '#1F4788',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        categories: ["business", "event", "management"],
        icons: [
          {
            src: '/logo.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' 
          }
        ],
        screenshots: [
          {
            src: '/logo.png', 
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BRICS Dashboard'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile View'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15728640, 
        importScripts: ['/firebase-messaging-sw.js'],
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/api/] 
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