/**
 * Pause control for the marquee bands (D-11, WCAG 2.2.2). The animation itself is CSS; this only
 * flips `data-paused`: a click or tap on a band toggles that band, the button toggles both.
 */
class MarqueeBandsElement extends HTMLElement {
  #abort = new AbortController();

  connectedCallback() {
    const bands = [...this.querySelectorAll<HTMLElement>('[data-band]')];
    const toggle = this.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
    const { signal } = this.#abort;

    const sync = () => {
      const allPaused = bands.every((band) => band.hasAttribute('data-paused'));
      toggle?.setAttribute('aria-pressed', String(allPaused));
    };

    for (const band of bands) {
      band.addEventListener(
        'click',
        () => {
          band.toggleAttribute('data-paused');
          sync();
        },
        { signal },
      );
    }

    toggle?.addEventListener(
      'click',
      () => {
        const pause = toggle.getAttribute('aria-pressed') !== 'true';
        for (const band of bands) band.toggleAttribute('data-paused', pause);
        sync();
      },
      { signal },
    );

    // Without JS the button would do nothing, so it ships hidden.
    this.querySelector('[data-marquee-control]')?.removeAttribute('hidden');
  }

  disconnectedCallback() {
    this.#abort.abort();
    this.#abort = new AbortController();
  }
}

customElements.define('marquee-bands', MarqueeBandsElement);
