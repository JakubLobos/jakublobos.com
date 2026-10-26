import { currentSection, NAV_SECTIONS, type NavSection } from '../lib/nav.ts';

/** Marks the nav link of the section being read with aria-current="location". */
class ScrollSpyElement extends HTMLElement {
  #abort = new AbortController();

  connectedCallback() {
    const links = new Map<NavSection, HTMLAnchorElement>();
    for (const id of NAV_SECTIONS) {
      const link = this.querySelector<HTMLAnchorElement>(`a[href$="#${id}"]`);
      if (link) links.set(id, link);
    }

    let frame = 0;
    let current: NavSection | null = null;

    const update = () => {
      frame = 0;
      // Off the home page the sections don't exist and nothing is current.
      const next = currentSection(
        NAV_SECTIONS.map((id) => ({
          id,
          top: document.getElementById(id)?.getBoundingClientRect().top ?? null,
        })),
        window.innerHeight,
      );
      if (next === current) return;
      if (current) links.get(current)?.removeAttribute('aria-current');
      if (next) links.get(next)?.setAttribute('aria-current', 'location');
      current = next;
    };

    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };

    const { signal } = this.#abort;
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { passive: true, signal });
    // Late layout changes (fonts, images, section reflow) move sections without a scroll event.
    const resizes = new ResizeObserver(schedule);
    resizes.observe(document.body);
    signal.addEventListener('abort', () => {
      resizes.disconnect();
      cancelAnimationFrame(frame);
    });
    update();
  }

  disconnectedCallback() {
    this.#abort.abort();
  }
}

customElements.define('scroll-spy', ScrollSpyElement);
