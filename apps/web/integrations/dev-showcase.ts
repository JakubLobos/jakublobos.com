import type { AstroIntegration } from 'astro';

// The showcase (tokens and primitives) and the OG image source are review/build tools; they must never ship.
export default function devShowcase(): AstroIntegration {
  return {
    name: 'dev-showcase',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        injectRoute({ pattern: '/__showcase', entrypoint: './src/dev/showcase.astro' });
        injectRoute({ pattern: '/__og/[locale]', entrypoint: './src/dev/og.astro' });
      },
    },
  };
}
