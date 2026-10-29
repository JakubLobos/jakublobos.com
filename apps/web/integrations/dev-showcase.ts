import type { AstroIntegration } from 'astro';

// The showcase (tokens and primitives) is a review tool; it must never ship.
export default function devShowcase(): AstroIntegration {
  return {
    name: 'dev-showcase',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        injectRoute({ pattern: '/__showcase', entrypoint: './src/dev/showcase.astro' });
      },
    },
  };
}
