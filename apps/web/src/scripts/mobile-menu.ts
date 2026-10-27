import { breakpoints } from '../lib/breakpoints.ts';

/**
 * Full-screen navigation dialog. The native modal dialog provides the focus trap, the inert
 * background and Escape; this adds opening from the header button, closing on any link or Close,
 * closing when the layout leaves the mobile range, and the `html[data-menu-open]` contract
 * (scroll lock, hides the cookie banner).
 */
class MobileMenuElement extends HTMLElement {
  #abort = new AbortController();

  connectedCallback() {
    const dialog = this.querySelector('dialog');
    const trigger = document.querySelector<HTMLButtonElement>('[data-menu-trigger]');
    if (!dialog || !trigger) return;

    const root = document.documentElement;
    const { signal } = this.#abort;

    trigger.addEventListener(
      'click',
      () => {
        dialog.showModal();
        root.dataset.menuOpen = '';
        trigger.setAttribute('aria-expanded', 'true');
        // Start on Close rather than the logo, the dialog's first focusable element.
        dialog.querySelector<HTMLElement>('[data-menu-close]')?.focus();
      },
      { signal },
    );

    dialog.addEventListener(
      'click',
      ({ target }) => {
        if (target instanceof Element && target.closest('a[href], [data-menu-close]')) {
          dialog.close();
        }
      },
      { signal },
    );

    // The native modal keeps focus out of the page but lets Tab pass through the browser UI;
    // wrap it instead so keyboard users never leave the menu.
    dialog.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Tab') return;
        const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button');
        const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
        if (document.activeElement !== edge) return;
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0])?.focus();
      },
      { signal },
    );

    // Fires for every way of closing (Escape, Close, links, resize), so state is reset once, here.
    dialog.addEventListener(
      'close',
      () => {
        delete root.dataset.menuOpen;
        trigger.setAttribute('aria-expanded', 'false');
        // After a resize the Menu button is hidden; the logo is the visible stand-in.
        const target = trigger.checkVisibility()
          ? trigger
          : document.querySelector<HTMLElement>('[data-site-header] a[href]');
        target?.focus({ preventScroll: true });
      },
      { signal },
    );

    const mobile = matchMedia(breakpoints.mobile);
    mobile.addEventListener(
      'change',
      () => {
        if (!mobile.matches && dialog.open) dialog.close();
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#abort.abort();
  }
}

customElements.define('mobile-menu', MobileMenuElement);
