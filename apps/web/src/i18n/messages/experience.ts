import { defineMessages } from '../t.ts';

// PL is a draft for owner review (D-02).
export const experience = defineMessages({
  en: {
    // Already upper-cased: SectionHeading renders it as given.
    eyebrow: 'EXPERIENCE',
    title: 'Where I work',
    timeline: 'Experience timeline',
    kind: { experience: 'EXPERIENCE', education: 'EDUCATION' },
  },
  pl: {
    eyebrow: 'DOŚWIADCZENIE',
    title: 'Gdzie pracuję',
    timeline: 'Oś czasu doświadczenia',
    kind: { experience: 'DOŚWIADCZENIE', education: 'WYKSZTAŁCENIE' },
  },
});
