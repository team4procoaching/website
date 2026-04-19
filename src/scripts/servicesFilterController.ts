/**
 * Services filter controller — manages the category filter on /services.
 *
 * Extracted from the Astro component so the behavior is individually
 * readable, modifiable, and unit-testable. ServicesCatalog.astro imports
 * {@link initServicesFilter} and calls it on `astro:page-load`.
 *
 * Concerns (as named functions, not one monolith):
 * - {@link cacheDom} — query the filter container's buttons, groups, and
 *   service-to-category map once
 * - {@link applyFilter} — toggle `aria-pressed`, `data-view-mode`, roving
 *   tabindex, and per-group `.hidden`
 * - {@link resolveDeepLink} — resolve URL parameters and hash into an
 *   initial filter state
 * - {@link highlightService} — apply the `.quiz-highlight` pulse to a
 *   service card (used for `?service=` deep-links from the Quiz)
 * - {@link bindEvents} — click and keyboard listeners, including toolbar-
 *   pattern arrow/Home/End navigation with roving tabindex
 *
 * Supports three deep-link formats:
 * - `?category=bodybuilding` — filter without service target
 * - `?category=bodybuilding&service=competition-prep` — legacy quiz format
 * - `?service=competition-prep` — current quiz format (category resolved
 *   via the service-to-category map)
 * - `#bodybuilding` — hash-based category filter
 * - `#competition-prep` — hash-based service target (resolves to category)
 *
 * Unknown categories or service IDs fall back to the "All" view without
 * redirect or error.
 */

/**
 * Category value representing the "show everything" state. Also exported so
 * consumers that assemble filter items can reference it without duplicating
 * the string literal — see ServicesCatalog.astro for the reference consumer.
 */
export const ALL_CATEGORIES_SENTINEL = 'all';

/** Internal short alias used throughout this module. */
const ALL = ALL_CATEGORIES_SENTINEL;

/** How long to wait after filter application before scrolling/highlighting. */
const SCROLL_DELAY_MS = 100;
/** Delay before the quiz-highlight pulse starts (lets the card settle). */
const HIGHLIGHT_DELAY_MS = 400;
/** How long the quiz-highlight pulse stays on the card. */
const HIGHLIGHT_DURATION_MS = 3000;

/** Cached DOM references — queried once at init. */
type FilterDom = {
  /** The element with `data-services-filter`, also the viewMode surface. */
  container: HTMLElement;
  /** All filter buttons including the synthetic "All" button. */
  buttons: readonly HTMLButtonElement[];
  /** Category group containers below the filter. */
  groups: readonly HTMLElement[];
  /** Valid non-`all` category IDs, derived from button attributes. */
  categoryIds: readonly string[];
  /** Map of service ID → category ID, for `?service=`-only deep-links. */
  serviceToCategory: Record<string, string>;
};

/**
 * Parse the service-to-category map from the container's data attribute.
 * Falls back to an empty map if the attribute is missing or malformed —
 * deep-linking by service alone then silently degrades to "All".
 */
function parseServiceMap(container: HTMLElement): Record<string, string> {
  const raw = container.dataset.serviceMap;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

/** Query and cache DOM references for the filter container. */
function cacheDom(container: HTMLElement): FilterDom {
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[data-category-button]'),
  );
  const groups = Array.from(container.querySelectorAll<HTMLElement>('[data-category-group]'));
  const categoryIds = buttons
    .map((b) => b.dataset.categoryButton)
    .filter((id): id is string => id !== undefined && id !== ALL);
  return {
    container,
    buttons,
    groups,
    categoryIds,
    serviceToCategory: parseServiceMap(container),
  };
}

/**
 * Apply a filter state: toggle `aria-pressed` and roving tabindex on
 * buttons, toggle `.hidden` on groups, and set `data-view-mode` on the
 * container so CSS can differentiate "all" layout from "single" layout.
 *
 * Once any filter has been applied post-hydration, the head-script's
 * flash-mitigation `<style>` node is removed so the controller becomes
 * the sole authority on visibility.
 */
function applyFilter(dom: FilterDom, activeCategory: string): void {
  dom.container.dataset.viewMode = activeCategory === ALL ? 'all' : 'single';

  for (const button of dom.buttons) {
    const buttonId = button.dataset.categoryButton;
    const isActive = buttonId === activeCategory;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.setAttribute('tabindex', isActive ? '0' : '-1');
  }

  for (const group of dom.groups) {
    const groupId = group.dataset.categoryGroup;
    const isVisible = activeCategory === ALL || groupId === activeCategory;
    group.classList.toggle('hidden', !isVisible);
  }

  // Hand visibility authority from the head-script/CSS over to the controller.
  document.getElementById('services-flash-mitigation')?.remove();

  // URL hash: "All" → strip hash; otherwise write the active category.
  const targetHash = activeCategory === ALL ? '' : `#${encodeURIComponent(activeCategory)}`;
  const newUrl = `${window.location.pathname}${window.location.search}${targetHash}`;
  history.replaceState(null, '', newUrl);
}

/** Smoothly scroll the filter container into view (block: 'start'). */
function scrollToFilter(dom: FilterDom): void {
  dom.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Scroll a specific service card into view (block: 'center'). */
function scrollToService(serviceId: string): boolean {
  const el = document.getElementById(`service-${serviceId}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

/**
 * Apply a temporary highlight pulse to the service card. The `.quiz-highlight`
 * class drives the animation defined in global.css; delays are picked to give
 * the card time to finish any reveal animation before the pulse starts.
 */
function highlightService(serviceId: string): void {
  window.setTimeout(() => {
    const el = document.getElementById(`service-${serviceId}`);
    if (!el) return;
    el.classList.add('quiz-highlight');
    window.setTimeout(() => {
      el.classList.remove('quiz-highlight');
    }, HIGHLIGHT_DURATION_MS);
  }, HIGHLIGHT_DELAY_MS);
}

/**
 * Resolve the initial filter state from URL query parameters and URL hash.
 * Returns an object describing the category to filter to and whether to
 * scroll/highlight a specific service. The pre-hydration flash-mitigation
 * inline script in `src/pages/services/index.astro` runs the same
 * resolution for its style-node injection — see the sync-constraint JSDoc
 * on `resolveDeepLink` below.
 */
type DeepLinkTarget = {
  /** Category to show, or 'all' if no valid target was found. */
  category: string;
  /** Service ID to scroll/highlight, if any. */
  serviceId: string | null;
  /** Whether the target was derived from an explicit link (scroll desired). */
  fromLink: boolean;
};

/**
 * Resolve the incoming URL parameters and hash into an initial filter state.
 * Returns the target category (or `ALL`), an optional service id for
 * scroll/highlight, and a `fromLink` flag that indicates whether the page
 * should scroll after apply.
 *
 * Sync constraint: the flash-mitigation inline script in
 * `src/pages/services/index.astro` implements the same resolution logic for
 * the pre-hydration phase (before first paint). Both MUST stay in sync —
 * changes to priority order or validation semantics must be applied to both
 * sides. The inline script's JSDoc block documents the pattern's design
 * rationale; this function is the authoritative client-side resolver.
 */
function resolveDeepLink(dom: FilterDom): DeepLinkTarget {
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get('category');
  const serviceParam = params.get('service');
  const hash = decodeURIComponent(window.location.hash.slice(1));

  // 1. Explicit service param (with or without category) — highest priority.
  if (serviceParam) {
    const category = dom.serviceToCategory[serviceParam];
    if (category && dom.categoryIds.includes(category)) {
      return { category, serviceId: serviceParam, fromLink: true };
    }
  }

  // 2. Explicit category param.
  if (categoryParam && dom.categoryIds.includes(categoryParam)) {
    return { category: categoryParam, serviceId: null, fromLink: true };
  }

  // 3. Hash as category.
  if (hash && dom.categoryIds.includes(hash)) {
    return { category: hash, serviceId: null, fromLink: true };
  }

  // 4. Hash as service ID.
  if (hash) {
    const category = dom.serviceToCategory[hash];
    if (category && dom.categoryIds.includes(category)) {
      return { category, serviceId: hash, fromLink: true };
    }
  }

  // 5. No valid target — default to "All". Not treated as an explicit link,
  //    so the page lands at the top without scroll.
  return { category: ALL, serviceId: null, fromLink: false };
}

/**
 * Apply the initial state. If the target came from a deep-link, scroll to
 * the filter (or service card) after a short delay to let the DOM settle.
 */
function applyInitialState(dom: FilterDom): void {
  const target = resolveDeepLink(dom);
  applyFilter(dom, target.category);

  if (!target.fromLink) return;

  window.setTimeout(() => {
    if (target.serviceId) {
      const scrolled = scrollToService(target.serviceId);
      if (scrolled) {
        highlightService(target.serviceId);
        return;
      }
    }
    scrollToFilter(dom);
  }, SCROLL_DELAY_MS);
}

/**
 * Bind click and keyboard listeners. Arrow keys / Home / End implement the
 * WAI-ARIA toolbar pattern: focus moves between buttons without activating
 * them. Click and Enter/Space activate. After activation, focus stays on
 * the pressed button (no shift), per the spec's focus-management rule.
 */
function bindEvents(dom: FilterDom): void {
  for (const button of dom.buttons) {
    button.addEventListener('click', () => {
      const categoryId = button.dataset.categoryButton;
      if (!categoryId) return;
      applyFilter(dom, categoryId);
      scrollToFilter(dom);
    });
  }

  for (const [index, button] of dom.buttons.entries()) {
    button.addEventListener('keydown', (event: KeyboardEvent) => {
      let targetIndex = index;
      if (event.key === 'ArrowRight') {
        targetIndex = (index + 1) % dom.buttons.length;
      } else if (event.key === 'ArrowLeft') {
        targetIndex = (index - 1 + dom.buttons.length) % dom.buttons.length;
      } else if (event.key === 'Home') {
        targetIndex = 0;
      } else if (event.key === 'End') {
        targetIndex = dom.buttons.length - 1;
      } else {
        return;
      }
      event.preventDefault();

      // Update roving tabindex so focus can move with keyboard. The pressed
      // state stays on the previously-activated button until the user
      // actually activates the now-focused one.
      for (const b of dom.buttons) b.setAttribute('tabindex', '-1');
      const nextButton = dom.buttons[targetIndex];
      nextButton.setAttribute('tabindex', '0');
      nextButton.focus();
    });
  }
}

/**
 * Initialize a services filter instance. Idempotent — skips if already
 * initialized on the given container. Called by ServicesCatalog.astro's
 * module script on `astro:page-load`.
 */
export function initServicesFilter(container: HTMLElement): void {
  if (container.dataset.filterInitialized === 'true') return;
  container.dataset.filterInitialized = 'true';

  const dom = cacheDom(container);
  applyInitialState(dom);
  bindEvents(dom);
}
