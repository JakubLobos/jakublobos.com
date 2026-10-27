// CSS cannot tell a click from Tab on a text field (browsers always match :focus-visible there), so
// record the last input kind on <html>. Absent means unknown, and unknown keeps the focus ring.
const root = document.documentElement;
const record = (modality: 'pointer' | 'keyboard') => () => {
  root.dataset.modality = modality;
};

document.addEventListener('pointerdown', record('pointer'), { capture: true, passive: true });
document.addEventListener('keydown', record('keyboard'), { capture: true, passive: true });
