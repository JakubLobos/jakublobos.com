import {
  diffUnits,
  isWhitespaceUnit,
  splitGraphemes,
  splitRuns,
  unitIndexAt,
} from '../lib/text-diff.ts';

type Control = HTMLInputElement | HTMLTextAreaElement;

/**
 * Moves only the nodes that are out of order. A node that is re-inserted restarts its CSS
 * animation, so untouched characters must stay exactly where they are.
 */
function place(parent: Node, nodes: readonly Node[]): void {
  let ref = parent.firstChild;
  for (const node of nodes) {
    if (node === ref) ref = ref.nextSibling;
    else parent.insertBefore(node, ref);
  }
  while (ref) {
    const next = ref.nextSibling;
    parent.removeChild(ref);
    ref = next;
  }
}

function createWord(): HTMLElement {
  const word = document.createElement('span');
  word.dataset.word = '';
  return word;
}

/**
 * Decorative per-character "type-in" mirror over a real input or textarea (see TypingField.astro).
 * The mirror is rebuilt from the control's value, never from HTML, and only newly typed characters
 * get the animation.
 */
class TypingField extends HTMLElement {
  #control: Control | null = null;
  #mirror: HTMLElement | null = null;
  #listeners: AbortController | null = null;
  #units: string[] = [];
  /** One node per unit: a Text node for whitespace, a glyph span otherwise. */
  #nodes: Node[] = [];
  #composing = false;
  #width = 0;
  #resize: ResizeObserver | null = null;

  connectedCallback(): void {
    const control = this.querySelector('input, textarea');
    const mirror = this.querySelector('[data-mirror]');
    if (
      !(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) ||
      !(mirror instanceof HTMLElement)
    ) {
      return;
    }
    this.#control = control;
    this.#mirror = mirror;

    const abort = new AbortController();
    this.#listeners = abort;
    const opts = { signal: abort.signal };

    control.addEventListener(
      'input',
      (event) => {
        this.#sync(!this.#composing && !(event instanceof InputEvent && event.isComposing));
      },
      opts,
    );
    control.addEventListener('compositionstart', () => (this.#composing = true), opts);
    control.addEventListener(
      'compositionend',
      () => {
        this.#composing = false;
        this.#sync(false);
      },
      opts,
    );
    for (const type of ['scroll', 'keyup', 'select'] as const) {
      control.addEventListener(
        type,
        () => {
          this.#syncScroll();
        },
        opts,
      );
    }
    mirror.addEventListener(
      'animationend',
      (event) => {
        // Reparenting a finished glyph would replay its animation, so drop the trigger.
        if (event.target instanceof HTMLElement) delete event.target.dataset.fresh;
      },
      opts,
    );
    // `reset` fires before the values change.
    control.form?.addEventListener(
      'reset',
      () =>
        setTimeout(() => {
          this.#sync(false);
        }),
      opts,
    );
    // Form restoration and the back-forward cache change the value without an input event.
    window.addEventListener(
      'pageshow',
      () => {
        this.#sync(false);
      },
      opts,
    );

    if (this.hasAttribute('data-auto-grow')) {
      this.#resize = new ResizeObserver(() => {
        const width = this.clientWidth;
        if (width === this.#width) return;
        this.#width = width;
        this.#grow();
      });
      this.#resize.observe(this);
      void document.fonts.ready.then(() => {
        this.#grow();
      });
    }

    this.#sync(false);
  }

  disconnectedCallback(): void {
    this.#listeners?.abort();
    this.#listeners = null;
    this.#resize?.disconnect();
    this.#resize = null;
  }

  /**
   * Clears the value and the mirror (used after a successful submit). Fires a bubbling `input`
   * event so counters listening on the control update; the element's own listener resyncs.
   */
  reset(): void {
    if (!this.#control) return;
    this.#control.value = '';
    this.#control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  #sync(animate: boolean): void {
    const control = this.#control;
    if (!control) return;

    const next = splitGraphemes(control.value);
    // `selectionStart` is null for input types without a text selection.
    const caret = control.selectionStart;
    const diff = diffUnits(
      this.#units,
      next,
      caret === null ? undefined : unitIndexAt(next, caret),
    );
    if (diff.removed > 0 || diff.inserted > 0) {
      const added = next
        .slice(diff.start, diff.start + diff.inserted)
        .map((unit) => this.#createNode(unit, animate));
      for (const node of this.#nodes.splice(diff.start, diff.removed, ...added)) {
        node.parentNode?.removeChild(node);
      }
      this.#units = next;
      this.#layout();
    }

    this.#grow();
    this.#syncScroll();
  }

  #createNode(unit: string, animate: boolean): Node {
    if (isWhitespaceUnit(unit)) return document.createTextNode(unit);
    const glyph = document.createElement('span');
    glyph.dataset.glyph = '';
    if (animate) glyph.dataset.fresh = '';
    glyph.textContent = unit;
    return glyph;
  }

  /** Groups glyphs into words (so wrapping matches the control), reusing existing wrappers. */
  #layout(): void {
    const mirror = this.#mirror;
    if (!mirror) return;

    const claimed = new Set<Node>();
    const top: Node[] = [];
    for (const run of splitRuns(this.#units)) {
      const nodes = this.#nodes.slice(run.from, run.to);
      if (!run.word) {
        top.push(...nodes);
        continue;
      }
      const existing = nodes
        .map((node) => node.parentNode)
        .find(
          (parent): parent is HTMLElement => parent instanceof HTMLElement && !claimed.has(parent),
        );
      const word = existing ?? createWord();
      claimed.add(word);
      place(word, nodes);
      top.push(word);
    }
    for (const child of Array.from(mirror.children)) {
      if (!claimed.has(child)) mirror.removeChild(child);
    }
    place(mirror, top);
  }

  #grow(): void {
    const control = this.#control;
    if (!control || !this.hasAttribute('data-auto-grow')) return;
    control.style.height = 'auto';
    if (control.scrollHeight === 0) {
      // Not rendered (hidden ancestor); leave the natural height.
      control.style.removeProperty('height');
      return;
    }
    const border = control.offsetHeight - control.clientHeight;
    control.style.height = `${control.scrollHeight + border}px`;
  }

  #syncScroll(): void {
    if (!this.#control || !this.#mirror) return;
    this.#mirror.scrollLeft = this.#control.scrollLeft;
    this.#mirror.scrollTop = this.#control.scrollTop;
  }
}

if (!customElements.get('typing-field')) customElements.define('typing-field', TypingField);

declare global {
  interface HTMLElementTagNameMap {
    'typing-field': TypingField;
  }
}
