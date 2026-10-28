// Presentation of the "Copied!" tag: DOM, placement and timing. The behaviour is in copy-email.ts.
// The keyframes live in styles/motion/copy-tag.css and are driven by `data-state`.

import { placeCopyTag } from '../lib/copy-tag-position.ts';
import { prefersReducedMotion, tokenDuration } from './motion.ts';

const HOLD_MS = 1800;
const SVG_NS = 'http://www.w3.org/2000/svg';

let tag: HTMLElement | undefined;
let label: HTMLSpanElement | undefined;
let hold: number | undefined;
let leave: number | undefined;

function build(): HTMLElement {
  const element = document.createElement('div');
  element.className = 'copy-tag';
  // The popover keeps the tag in the top layer, so it also shows above the modal mobile menu.
  element.popover = 'manual';
  element.setAttribute('aria-hidden', 'true');

  const tick = document.createElementNS(SVG_NS, 'svg');
  tick.setAttribute('viewBox', '0 0 16 16');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3 8.5 6.5 12 13 4.5');
  tick.append(path);

  label = document.createElement('span');
  element.append(tick, label);
  document.body.append(element);
  return element;
}

function hide(element: HTMLElement) {
  delete element.dataset.state;
  if (element.matches(':popover-open')) element.hidePopover();
}

/** Shows the tag next to `anchor`; a repeated call restarts it instead of stacking a second one. */
export function showCopyTag(anchor: Element, text: string) {
  window.clearTimeout(hold);
  window.clearTimeout(leave);
  const element = (tag ??= build());
  if (label) label.textContent = text;

  hide(element);
  element.showPopover();
  const placement = placeCopyTag(
    anchor.getBoundingClientRect(),
    { width: element.offsetWidth, height: element.offsetHeight },
    { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
  );
  element.style.setProperty('--tag-x', `${placement.left}px`);
  element.style.setProperty('--tag-y', `${placement.top}px`);
  element.dataset.state = 'in';

  hold = window.setTimeout(() => {
    element.dataset.state = 'out';
    const fade = prefersReducedMotion() ? 0 : tokenDuration(element, '--duration-state');
    leave = window.setTimeout(() => {
      hide(element);
    }, fade);
  }, HOLD_MS);
}
