import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'never',
  server: { port: 4321 },
  vite: {
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  },
});
