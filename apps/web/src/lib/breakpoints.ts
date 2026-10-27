// Mirrors docs/design-system.md §2.6. Custom properties can't be used in media queries,
// so CSS repeats these strings; keep both in sync.
export const breakpoints = {
  mobile: '(width < 760px)',
  narrow: '(width < 980px)',
  compactExperience: '(width < 820px), (height < 860px)',
} as const;

export type BreakpointName = keyof typeof breakpoints;

type MatchMedia = (query: string) => { readonly matches: boolean };

export function matches(
  name: BreakpointName,
  matchMedia: MatchMedia = globalThis.matchMedia,
): boolean {
  return matchMedia(breakpoints[name]).matches;
}
