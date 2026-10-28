import type { Locale } from '@portfolio/contracts';
import { polishTypography } from '../lib/pl-typography.ts';

export interface SkillGroup {
  label: Record<Locale, string>;
  /** Tool and technology names are kept in English in every locale. */
  items: readonly string[];
}

// PL group labels are drafts pending owner review (D-02).
const rawGroups: readonly SkillGroup[] = [
  { label: { en: 'Core', pl: 'Podstawy' }, items: ['React', 'TypeScript', 'Astro'] },
  { label: { en: 'Design', pl: 'Projektowanie' }, items: ['UI/UX', 'Figma'] },
  {
    label: { en: 'UI & styling', pl: 'UI i stylowanie' },
    items: ['Tailwind', 'styled-components', 'MUI', 'Tamagui', 'Storybook', 'react-email'],
  },
  {
    label: { en: 'State & APIs', pl: 'Stan i API' },
    items: ['Redux Toolkit', 'TanStack', 'WebSocket', 'gRPC'],
  },
  {
    label: { en: 'Libraries', pl: 'Biblioteki' },
    items: ['Formik', 'Yup', 'Superstruct', 'i18next', 'Chart.js', 'ts-money'],
  },
  {
    label: { en: 'Testing', pl: 'Testowanie' },
    items: ['Jest', 'Vitest', 'React Testing Library', 'Playwright'],
  },
  {
    label: { en: 'Workflow', pl: 'Workflow' },
    items: ['Git', 'GitHub Packages', 'monorepo', 'PostHog', 'A/B testing', 'AI-assisted coding'],
  },
  // Worked with, but far less deeply than the groups above.
  {
    label: { en: 'Familiar with', pl: 'Miałem styczność' },
    items: ['Next.js', 'React Native'],
  },
];

export const skillGroups: readonly SkillGroup[] = rawGroups.map((group) => ({
  ...group,
  label: { ...group.label, pl: polishTypography(group.label.pl) },
}));
