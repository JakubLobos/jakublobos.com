import type { Locale } from '@portfolio/contracts';
import { polishTypography } from '../lib/pl-typography.ts';

/** Band A: identical in both locales (product names). */
export const marqueeTech = [
  'React',
  'TypeScript',
  'Next.js',
  'Astro',
  'Figma',
  'UI/UX',
  'Tailwind',
  'Redux Toolkit',
  'TanStack',
  'WebSocket',
  'Storybook',
  'A/B Testing',
] as const;

/** Band B. The PL lines are drafts pending owner review. */
const rawFacts = {
  en: [
    'Frontend Developer',
    'Kraków, Poland',
    'Building for people',
    'Sole frontend dev at two teams',
    'Mentor to interns',
    'Computer Science student',
    'Polish & English',
  ],
  pl: [
    'Frontend Developer',
    'Kraków, Polska',
    'Tworzę dla ludzi',
    'Jedyny frontendowiec w dwóch zespołach',
    'Mentor dla stażystów',
    'Student informatyki',
    'Polski i angielski',
  ],
} satisfies Record<Locale, readonly string[]>;

export const marqueeFacts: Record<Locale, readonly string[]> = {
  en: rawFacts.en,
  pl: rawFacts.pl.map(polishTypography),
};
