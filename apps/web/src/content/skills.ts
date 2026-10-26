import type { Locale } from '@portfolio/contracts';
import { polishTypography } from '../lib/pl-typography.ts';

export interface SkillGroup {
  label: Record<Locale, string>;
  /** Tool and technology names are kept in English in every locale. */
  items: readonly string[];
}

// PL group labels are drafts pending owner review (D-02).
const rawGroups: readonly SkillGroup[] = [
  { label: { en: 'Core', pl: 'Podstawy' }, items: ['React', 'TypeScript', 'UI/UX', 'Figma', 'AI'] },
  {
    label: { en: 'Frameworks', pl: 'Frameworki' },
    items: ['Next.js', 'Astro', 'SSG', 'Tailwind'],
  },
  {
    label: { en: 'Data & state', pl: 'Dane i stan' },
    items: ['Redux Toolkit', 'TanStack', 'WebSocket'],
  },
  {
    label: { en: 'Testing', pl: 'Testowanie' },
    items: ['Jest', 'Vitest', 'React Testing Library', 'Storybook', 'A/B Testing'],
  },
  { label: { en: 'Workflow', pl: 'Workflow' }, items: ['Git', 'GitHub Packages'] },
];

export const skillGroups: readonly SkillGroup[] = rawGroups.map((group) => ({
  ...group,
  label: { ...group.label, pl: polishTypography(group.label.pl) },
}));
