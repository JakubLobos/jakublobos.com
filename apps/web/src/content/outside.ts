import type { Locale } from '@portfolio/contracts';
import type { ImageMetadata } from 'astro';
import iceland from '../assets/outside/iceland.jpg';
import japan from '../assets/outside/japan.jpg';
import madeira from '../assets/outside/madeira.jpg';
import { polishTypography } from '../lib/pl-typography.ts';

type Localized = Record<Locale, string>;

export interface OutsidePhoto {
  id: string;
  src: ImageMetadata;
  alt: Localized;
  /** `sizes` for this collage slot (its rendered width), kept next to the slot it describes. */
  sizes: string;
}

// PL alt texts are drafts pending owner review (D-02). The collage slots in Outside.astro are
// matched by position: 1 wide landscape (4:3), 2 and 3 portraits (3:4). Keep that order when
// swapping photos. `sizes` are the slot's rendered image widths, measured in a browser: from
// 760px up the column is capped, below it the slot scales with the viewport (a slight
// over-estimate at 390px). The srcset widths in Outside.astro cover 2x of the largest.
const rawPhotos: readonly OutsidePhoto[] = [
  {
    id: 'madeira',
    src: madeira,
    alt: {
      en: 'Green mountain ridges above the ocean on Madeira',
      pl: 'Zielone górskie grzbiety nad oceanem na Maderze',
    },
    sizes: '(min-width: 760px) 250px, 60vw',
  },
  {
    id: 'iceland',
    src: iceland,
    alt: {
      en: 'A car with a rooftop tent by a lake under a grey Icelandic sky',
      pl: 'Samochód z namiotem dachowym nad jeziorem pod szarym islandzkim niebem',
    },
    sizes: '(min-width: 760px) 150px, 35vw',
  },
  {
    id: 'japan',
    src: japan,
    alt: {
      en: 'Jakub holding a tray of street food on a busy, neon-lit street in Japan',
      pl: 'Jakub z tacką ulicznego jedzenia na zatłoczonej, pełnej neonów ulicy w Japonii',
    },
    sizes: '(min-width: 760px) 170px, 41vw',
  },
];

export const outsidePhotos: readonly OutsidePhoto[] = rawPhotos.map((photo) => ({
  ...photo,
  alt: { ...photo.alt, pl: polishTypography(photo.alt.pl) },
}));
