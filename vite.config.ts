import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from './src/config/app';

// The install-time identity (tab title, PWA manifest) derives from
// src/config/app.ts so the child's name lives in exactly one place.
const manifest = JSON.stringify(
  {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3eee1',
    theme_color: '#f3eee1',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  null,
  2,
);

function identityFromConfig(): Plugin {
  return {
    name: 'identity-from-config',
    transformIndexHtml(html) {
      return html.replaceAll('%APP_NAME%', APP_NAME);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest });
    },
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifest);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), identityFromConfig()],
  base: './',
  build: {
    target: 'es2021',
    assetsInlineLimit: 0,
  },
});
