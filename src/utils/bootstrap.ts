/**
 * Shared bootstrap helper for component module scripts.
 *
 * Dispatches the given init function on both events:
 * - `DOMContentLoaded` with `{ once: true }` — fires on hard loads (cold
 *   page loads from bookmarks, email links, social shares) when View
 *   Transitions are disabled
 * - `astro:page-load` — fires on every View Transition navigation,
 *   including the initial load when View Transitions are active
 *
 * Consumers must make the init function idempotent, typically via a
 * `data-initialized` guard set synchronously at function entry. Async
 * init functions must set the guard before their first `await` point —
 * dual dispatch means the callback may re-enter while a prior
 * invocation is still pending; a guard set after an async boundary
 * would not close the re-entrancy window.
 *
 * See ADR-0026 for the pattern and its rationale.
 *
 * @example
 * ```ts
 * // in Component.astro's <script> block:
 * import { bootstrapOnLoad } from '~/utils/bootstrap';
 * import { initComponent } from '~/scripts/componentController';
 *
 * bootstrapOnLoad(() => {
 *   document.querySelectorAll<HTMLElement>('[data-component]').forEach(initComponent);
 * });
 * ```
 */
export function bootstrapOnLoad(init: () => void): void {
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
  document.addEventListener('astro:page-load', init);
}
