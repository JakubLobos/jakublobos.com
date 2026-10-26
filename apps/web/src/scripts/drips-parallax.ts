// The fixed top drips slide up to 180 px as the page scrolls towards Experience (design-analysis §4.5).
const MAX_TRAVEL_PX = 180;

const drips = document.querySelector<HTMLElement>('[data-drips][data-variant="top"]');
const experience = document.getElementById('experience');

if (drips && experience) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  const update = (): void => {
    frame = 0;
    const experienceTop = experience.getBoundingClientRect().top + scrollY;
    const progress = Math.min(1, scrollY / Math.max(1, experienceTop));
    drips.style.setProperty('transform', `translateY(${-progress * MAX_TRAVEL_PX}px)`);
  };

  const schedule = (): void => {
    frame ||= requestAnimationFrame(update);
  };

  const sync = (): void => {
    if (reducedMotion.matches) {
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      frame = 0;
      drips.style.removeProperty('transform');
      return;
    }
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    schedule();
  };

  reducedMotion.addEventListener('change', sync);
  sync();
}
