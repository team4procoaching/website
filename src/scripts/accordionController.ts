/**
 * Accordion controller — enforces exclusive-open behavior on an
 * `<Accordion exclusive>` instance.
 *
 * The Accordion primitive renders one `<button commandfor="{id}">` per item
 * and a corresponding `<el-disclosure id="{id}">` panel. Clicking a button
 * triggers the Invokers API, which toggles the target panel via
 * `@tailwindplus/elements` — that behavior is handled by the browser and
 * the custom element; this controller does not replicate it.
 *
 * When `exclusive` is set on the Accordion, this controller listens for
 * clicks on trigger buttons inside the container and calls `.hide()` on
 * every *other* `<el-disclosure>` whose `hidden` attribute is absent.
 * The clicked item's own toggle is left to the Invokers API, so the
 * interaction remains declarative.
 */

/**
 * Hide every `<el-disclosure>` inside `container` whose id differs from
 * `activeId` and that is not already hidden. Prefers the custom element's
 * `.hide()` method; falls back to a direct `hidden` attribute write when
 * the method is unavailable.
 */
function hideOtherDisclosures(container: HTMLElement, activeId: string): void {
  const disclosures = container.querySelectorAll<HTMLElement>('el-disclosure');
  for (const disclosure of disclosures) {
    if (disclosure.id === activeId) continue;
    if (disclosure.hasAttribute('hidden')) continue;

    const hide = (disclosure as HTMLElement & { hide?: () => void }).hide;
    if (typeof hide === 'function') {
      hide.call(disclosure);
    } else {
      disclosure.setAttribute('hidden', '');
    }
  }
}

/**
 * Initialize exclusive-open behavior for one Accordion container. Idempotent
 * via the `data-accordion-initialized` attribute — safe to re-invoke on
 * `astro:page-load` (ADR-0026 dual-dispatch).
 */
export function initAccordion(container: HTMLElement): void {
  if ('accordionInitialized' in container.dataset) return;
  container.dataset.accordionInitialized = '';

  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>('button[commandfor]');
    if (!button || !container.contains(button)) return;

    const activeId = button.getAttribute('commandfor');
    if (!activeId) return;

    hideOtherDisclosures(container, activeId);
  });
}
