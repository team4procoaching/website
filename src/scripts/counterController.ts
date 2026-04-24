/**
 * Counter controller — drives the scroll-triggered count-up animation for
 * `[data-countup]` elements.
 *
 * Extracted from `ScrollAnimations.astro`'s inline script so the behavior is
 * individually testable — in particular the prefix/suffix composition and
 * the `prefers-reduced-motion` guard, both of which are regression-prone
 * when they live inside an Astro `<script>` block.
 *
 * Data attribute contract (set at build time by the consumer, e.g.
 * `StatsGrid.astro`):
 * - `data-countup` — marker selector; presence enables the observer
 * - `data-countup-target` — numeric target (required)
 * - `data-countup-prefix` — text rendered before the number (optional)
 * - `data-countup-suffix` — text rendered after the number (optional)
 * - `data-counted` — set to `"true"` once the animation has started or
 *   completed; used as the idempotency marker across re-init calls and as
 *   the `:not([data-counted])` exclusion in {@link initCounters}
 *
 * Concerns (as named functions, not one monolith):
 * - {@link composeCounterText} — pure text composition, isolated so unit
 *   tests can assert prefix/number/suffix handling without DOM
 * - {@link animateCounter} — RAF loop + reduced-motion guard + idempotency
 * - {@link initCounters} — IntersectionObserver bootstrap, scanned under a
 *   provided root so the same entry point works for `document` and for
 *   dynamically injected subtrees
 */

/** Duration of the count-up animation in milliseconds. */
const COUNTER_DURATION_MS = 2000;

/** IntersectionObserver threshold — counters start when half visible. */
const COUNTER_INTERSECTION_THRESHOLD = 0.5;

/**
 * Compose the displayed counter text from the current value and the
 * caller-supplied prefix/suffix. The caller controls spacing — e.g. a
 * suffix of `' lbs'` renders `45 lbs`, a suffix of `'%'` renders `100%`.
 *
 * Pure function, no DOM side-effects, no reads from `Element.dataset`. This
 * is the seam the unit test asserts against so the composition contract
 * stays locked down independently of the RAF loop.
 */
export function composeCounterText(current: number, prefix: string, suffix: string): string {
  return `${prefix}${current}${suffix}`;
}

/**
 * Animate one counter element from 0 to its configured target.
 *
 * Reads configuration from `data-countup-target`, `data-countup-prefix`, and
 * `data-countup-suffix`. A missing or non-numeric target, or a target of 0,
 * is treated as "nothing to animate" and the call returns without touching
 * the element (the server-rendered placeholder remains visible).
 *
 * Idempotent: if the element is already marked `data-counted="true"`, the
 * call returns immediately. The marker is set eagerly — before scheduling
 * the first RAF tick in the animated path, before writing the final text in
 * the reduced-motion path — so a second call during the same frame cannot
 * race a second RAF loop onto the same element.
 *
 * Reduced motion: when `prefers-reduced-motion: reduce` matches, the final
 * text is written once via {@link composeCounterText} and the function
 * returns without scheduling any RAF work. ADR-0015 compliance — the
 * reveal animations honor the preference via CSS; the counter path honors
 * it here.
 */
export function animateCounter(el: HTMLElement): void {
  if (el.dataset.counted === 'true') return;

  const target = Number.parseInt(el.dataset.countupTarget ?? '', 10);
  if (Number.isNaN(target) || target === 0) return;

  const prefix = el.dataset.countupPrefix ?? '';
  const suffix = el.dataset.countupSuffix ?? '';

  el.dataset.counted = 'true';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = composeCounterText(target, prefix, suffix);
    return;
  }

  const startTime = performance.now();

  function tick(now: number): void {
    const progress = Math.min((now - startTime) / COUNTER_DURATION_MS, 1);
    // ease-out cubic
    const eased = 1 - (1 - progress) ** 3;
    const current = progress >= 1 ? target : Math.floor(eased * target);
    el.textContent = composeCounterText(current, prefix, suffix);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/**
 * Initialize the counter observer under the given root. Scans for
 * `[data-countup]:not([data-counted])` and attaches a single
 * `IntersectionObserver` that calls {@link animateCounter} on first
 * intersection and unobserves the element.
 *
 * Idempotent across repeated calls: each element's `data-counted` marker,
 * set by {@link animateCounter}, doubles as the `:not([data-counted])`
 * exclusion here. A second call after the first has already run picks up
 * only genuinely new, uncounted elements — anything already animated or
 * animating is filtered out at the query step.
 *
 * The observer disconnects itself once it has started the animation for
 * every element it was given; subsequent DOM insertions need a fresh
 * `initCounters` call (Astro's `astro:page-load` dispatch covers the View
 * Transition case from the consumer side).
 */
export function initCounters(root: Document | HTMLElement): void {
  const counters = Array.from(
    root.querySelectorAll<HTMLElement>('[data-countup]:not([data-counted])'),
  );
  if (counters.length === 0) return;

  let remaining = counters.length;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        if (el.dataset.counted === 'true') {
          remaining -= 1;
          if (remaining <= 0) observer.disconnect();
          continue;
        }
        animateCounter(el);
        remaining -= 1;
        if (remaining <= 0) observer.disconnect();
      }
    },
    { threshold: COUNTER_INTERSECTION_THRESHOLD },
  );

  for (const el of counters) observer.observe(el);
}
