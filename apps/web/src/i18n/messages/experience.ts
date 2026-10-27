import { defineMessages } from '../t.ts';

// PL is a draft for owner review (D-02).
export const experience = defineMessages({
  en: {
    // Already upper-cased: SectionHeading renders it as given.
    eyebrow: 'EXPERIENCE',
    title: 'My journey',
    timeline: 'Experience timeline',
    kind: { experience: 'EXPERIENCE', education: 'EDUCATION' },
  },
  pl: {
    eyebrow: 'DOŚWIADCZENIE',
    title: 'Moja droga',
    timeline: 'Oś czasu doświadczenia',
    kind: { experience: 'DOŚWIADCZENIE', education: 'WYKSZTAŁCENIE' },
  },
});
