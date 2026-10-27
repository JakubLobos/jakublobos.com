// CSS cannot tell a click from Tab on a text field (browsers always match :focus-visible there), so
// decide at focus time, like the focus-visible polyfill: typing later must not flip it. No attribute
// means unknown, and unknown keeps the focus ring.
const root = document.documentElement;
let last: 'pointer' | 'keyboard' | undefined;

document.addEventListener('pointerdown', () => (last = 'pointer'), {
  capture: true,
  passive: true,
});
document.addEventListener('keydown', () => (last = 'keyboard'), { capture: true, passive: true });
document.addEventListener(
  'focusin',
  () => {
    if (last) root.dataset.modality = last;
  },
  true,
);
