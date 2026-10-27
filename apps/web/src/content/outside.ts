import type { Locale } from '@portfolio/contracts';
import type { ImageMetadata } from 'astro';
import photo1 from '../assets/outside/photo-1.jpg';
import photo2 from '../assets/outside/photo-2.jpg';
import photo3 from '../assets/outside/photo-3.jpg';
import { polishTypography } from '../lib/pl-typography.ts';

type Localized = Record<Locale, string>;

export interface OutsidePhoto {
  id: string;
  src: ImageMetadata;
  alt: Localized;
}

// TODO(owner): the three photos are generated placeholders. To use real ones, replace the files
// in src/assets/outside/ and write the real alt text below. PL alt texts are drafts (D-02).
const rawPhotos: readonly OutsidePhoto[] = [
  {
    id: 'photo-1',
    src: photo1,
    alt: { en: 'Travel photo (placeholder)', pl: 'Zdjęcie z podróży (zastępcze)' },
  },
  {
    id: 'photo-2',
    src: photo2,
    alt: { en: 'Travel photo (placeholder)', pl: 'Zdjęcie z podróży (zastępcze)' },
  },
  {
    id: 'photo-3',
    src: photo3,
    alt: { en: 'Travel photo (placeholder)', pl: 'Zdjęcie z podróży (zastępcze)' },
  },
];

export const outsidePhotos: readonly OutsidePhoto[] = rawPhotos.map((photo) => ({
  ...photo,
  alt: { ...photo.alt, pl: polishTypography(photo.alt.pl) },
}));
