import { defineConfig, fontProviders } from 'astro/config';
import devShowcase from './integrations/dev-showcase.ts';

const provider = fontProviders.fontsource();
// Polish needs latin-ext (ą ć ę ł ń ó ś ź ż).
const subsets: ['latin', 'latin-ext'] = ['latin', 'latin-ext'];

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'never',
  server: { port: 4321 },
  integrations: [devShowcase()],
  fonts: [
    {
      name: 'Poppins',
      cssVariable: '--font-body',
      provider,
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets,
      fallbacks: ['sans-serif'],
    },
    {
      name: 'Ubuntu',
      cssVariable: '--font-ui',
      provider,
      weights: [500],
      styles: ['normal'],
      subsets,
      fallbacks: ['sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider,
      weights: [400],
      styles: ['normal'],
      subsets,
      fallbacks: ['monospace'],
    },
    {
      name: 'Rubik Doodle Shadow',
      cssVariable: '--font-display',
      provider,
      weights: [400],
      styles: ['normal'],
      subsets,
      fallbacks: ['cursive'],
    },
  ],
  vite: {
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  },
});
