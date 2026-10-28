// D-36: few visitors have a mail client, so activating an email link copies the address. The
// markup stays a real mailto: link; whenever copying is not possible the browser follows it.
// Presentation is in copy-toast.ts.

import { showCopyTag } from './copy-toast.ts';

const SELECTOR = 'a[data-copy-email]';
const HINT_ID = 'copy-email-hint';
const ANNOUNCE_ID = 'copy-email-announce';

function addressOf(link: HTMLAnchorElement): string | undefined {
  if (link.protocol !== 'mailto:') return undefined;
  return decodeURIComponent(link.pathname) || undefined;
}

function announce(region: HTMLElement, text: string) {
  // Clear first so copying twice in a row is announced twice.
  region.textContent = '';
  requestAnimationFrame(() => (region.textContent = text));
}

// The description only holds once this script runs, so it is attached here, not in the markup.
for (const link of document.querySelectorAll<HTMLAnchorElement>(SELECTOR)) {
  link.setAttribute('aria-describedby', HINT_ID);
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link =
    event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(SELECTOR) : null;
  const address = link && addressOf(link);
  const region = document.getElementById(ANNOUNCE_ID);
  // Without the clipboard API (or the region it announces in) the default mailto: navigation runs.
  if (!link || !address || !region || !('clipboard' in navigator)) return;
  event.preventDefault();

  navigator.clipboard.writeText(address).then(
    () => {
      showCopyTag(link, region.dataset.tag ?? '');
      announce(region, region.dataset.announced ?? '');
    },
    () => {
      location.href = link.href;
    },
  );
});
