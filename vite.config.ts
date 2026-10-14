/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { prerenderLocales } from './scripts/prerender-plugin.mjs';
import { precompileMessages } from './scripts/precompile-messages-plugin.mjs';

// ARCH §11 — identical to public/_headers so `vite preview` exercises the production CSP.
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; font-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Content-Type-Options': 'nosniff',
};

export default defineConfig({
  plugins: [
    precompileMessages(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: false, // per-locale manifests live in public/{en,ar}/manifest.webmanifest (ARCH §10)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    prerenderLocales(),
  ],
  preview: { headers: securityHeaders },
  build: { target: 'es2022', sourcemap: false },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
