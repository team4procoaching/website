/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNotNull } from '~/test-utils/assertions';
import { initServicesFilter } from './servicesFilterController';

// ---------------------------------------------------------------------------
// Fixture — minimal DOM matching ServicesCatalog.astro's post-refactor output
// ---------------------------------------------------------------------------

const SERVICE_MAP = {
  'competition-prep': 'bodybuilding',
  'off-season': 'bodybuilding',
  'competition-ready': 'athletic',
  'get-lean': 'wellness',
};

function buildDom(): HTMLElement {
  const container = document.createElement('div');
  container.dataset.servicesFilter = '';
  container.dataset.serviceMap = JSON.stringify(SERVICE_MAP);
  container.innerHTML = `
    <div role="toolbar" aria-labelledby="filter-label">
      <button type="button" data-category-button="all" aria-pressed="true" tabindex="0">All</button>
      <button type="button" data-category-button="bodybuilding" aria-pressed="false" tabindex="-1">Bodybuilding</button>
      <button type="button" data-category-button="athletic" aria-pressed="false" tabindex="-1">Athletic</button>
      <button type="button" data-category-button="wellness" aria-pressed="false" tabindex="-1">Wellness</button>
    </div>
    <div data-category-group="bodybuilding">
      <div id="service-competition-prep">Competition Prep Card</div>
      <div id="service-off-season">Off-Season Card</div>
    </div>
    <div data-category-group="athletic">
      <div id="service-competition-ready">Competition Ready Card</div>
    </div>
    <div data-category-group="wellness">
      <div id="service-get-lean">Get Lean Card</div>
    </div>
  `;
  document.body.appendChild(container);
  return container;
}

function setLocation(search: string, hash: string): void {
  // jsdom allows direct assignment to window.location.search/hash
  globalThis.history.replaceState(null, '', `/services${search}${hash}`);
}

// Simulates an external URL change followed by a hashchange event — the
// browser-native sequence when a user clicks an on-page anchor or edits the
// URL hash. history.replaceState alone does not fire hashchange in jsdom (or
// in browsers), so the test must dispatch the event explicitly.
function navigateAndDispatchHashChange(url: string): void {
  globalThis.history.replaceState(null, '', url);
  globalThis.dispatchEvent(new HashChangeEvent('hashchange'));
}

// Asserts the filter is in single-mode and the named category group is
// visible. Does not assert siblings are hidden — call sites add that check
// explicitly when they care.
function expectSingleModeWithVisibleGroup(container: HTMLElement, categoryId: string): void {
  expect(container.dataset.viewMode).toBe('single');
  const group = container.querySelector<HTMLElement>(`[data-category-group="${categoryId}"]`);
  assertNotNull(group);
  expect(group.classList.contains('hidden')).toBe(false);
}

// Focuses the toolbar button at the given index and dispatches a keydown for
// the given key. Used by the keyboard-navigation tests, which exercise the
// toolbar pattern via NodeListOf<HTMLButtonElement> and positional indices.
function pressKeyOnButton(
  buttons: NodeListOf<HTMLButtonElement>,
  index: number,
  key: string,
): void {
  const btn = buttons[index];
  btn.focus();
  btn.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// One-time compatibility shim: jsdom does not implement scrollIntoView on
// Element.prototype. Installing a no-op here lets vi.spyOn() below bind to
// a real property; restoreAllMocks() in afterEach restores the no-op (not
// undefined), so the mock cannot leak between tests.
if (!('scrollIntoView' in Element.prototype)) {
  // @ts-expect-error — runtime-only property patch for the jsdom gap
  Element.prototype.scrollIntoView = () => {};
}

beforeEach(() => {
  vi.useFakeTimers();
  setLocation('', '');
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('services-flash-mitigation')?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('initServicesFilter — initialization', () => {
  it('is idempotent — second call is a no-op', () => {
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.filterInitialized).toBe('true');
    // Second call must not throw or re-bind
    initServicesFilter(container);
    expect(container.dataset.filterInitialized).toBe('true');
  });

  it('defaults to "All" view with no URL parameters', () => {
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('all');
    for (const group of container.querySelectorAll<HTMLElement>('[data-category-group]')) {
      expect(group.classList.contains('hidden')).toBe(false);
    }
    const allButton = container.querySelector<HTMLButtonElement>('[data-category-button="all"]');
    assertNotNull(allButton);
    expect(allButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('removes the flash-mitigation style node after taking over visibility authority', () => {
    const style = document.createElement('style');
    style.id = 'services-flash-mitigation';
    style.textContent =
      '[data-category-group]:not([data-category-group="bodybuilding"]){display:none}';
    document.head.appendChild(style);
    const container = buildDom();
    initServicesFilter(container);
    expect(document.getElementById('services-flash-mitigation')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Click-driven filtering
// ---------------------------------------------------------------------------

describe('initServicesFilter — filter interaction', () => {
  it('hides non-matching groups when a category button is clicked', () => {
    const container = buildDom();
    initServicesFilter(container);
    const bodyBtn = container.querySelector<HTMLButtonElement>(
      '[data-category-button="bodybuilding"]',
    );
    assertNotNull(bodyBtn);
    bodyBtn.click();

    expect(container.dataset.viewMode).toBe('single');
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="bodybuilding"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="athletic"]')
        ?.classList.contains('hidden'),
    ).toBe(true);
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="wellness"]')
        ?.classList.contains('hidden'),
    ).toBe(true);
  });

  it('updates aria-pressed on the clicked button and resets the previously pressed one', () => {
    const container = buildDom();
    initServicesFilter(container);
    const bodyBtn = container.querySelector<HTMLButtonElement>(
      '[data-category-button="bodybuilding"]',
    );
    assertNotNull(bodyBtn);
    bodyBtn.click();

    const allBtn = container.querySelector<HTMLButtonElement>('[data-category-button="all"]');
    assertNotNull(allBtn);
    expect(allBtn.getAttribute('aria-pressed')).toBe('false');
    expect(bodyBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('writes the active category to the URL hash, and strips the hash on "All"', () => {
    const container = buildDom();
    initServicesFilter(container);
    const bodyBtn = container.querySelector<HTMLButtonElement>(
      '[data-category-button="bodybuilding"]',
    );
    const allBtn = container.querySelector<HTMLButtonElement>('[data-category-button="all"]');
    assertNotNull(bodyBtn);
    assertNotNull(allBtn);

    bodyBtn.click();
    expect(globalThis.location.hash).toBe('#bodybuilding');
    allBtn.click();
    expect(globalThis.location.hash).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Deep-link handling
// ---------------------------------------------------------------------------

describe('initServicesFilter — deep-links', () => {
  it('applies category filter from ?category= parameter', () => {
    setLocation('?category=wellness', '');
    const container = buildDom();
    initServicesFilter(container);
    expectSingleModeWithVisibleGroup(container, 'wellness');
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="bodybuilding"]')
        ?.classList.contains('hidden'),
    ).toBe(true);
  });

  it('resolves ?service= alone via the service-to-category map', () => {
    setLocation('?service=competition-prep', '');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');
    const bodyGroup = container.querySelector<HTMLElement>('[data-category-group="bodybuilding"]');
    assertNotNull(bodyGroup);
    expect(bodyGroup.classList.contains('hidden')).toBe(false);
  });

  it('respects legacy ?category=&service= format from earlier quiz results', () => {
    setLocation('?category=wellness&service=get-lean', '');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');
    const wellnessGroup = container.querySelector<HTMLElement>('[data-category-group="wellness"]');
    assertNotNull(wellnessGroup);
    expect(wellnessGroup.classList.contains('hidden')).toBe(false);
  });

  it('applies category filter from #hash', () => {
    setLocation('', '#athletic');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="athletic"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
  });

  it('resolves #service-hash via service-to-category map', () => {
    setLocation('', '#get-lean');
    const container = buildDom();
    initServicesFilter(container);
    expectSingleModeWithVisibleGroup(container, 'wellness');
  });

  it('falls back to "All" for unknown category (e.g. legacy mindset link)', () => {
    setLocation('?category=mindset', '');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('all');
  });

  it('falls back to "All" for unknown service (e.g. legacy life-coaching link)', () => {
    setLocation('?service=life-coaching', '');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('all');
  });

  it('falls back to "All" for unknown hash', () => {
    setLocation('', '#not-a-real-thing');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('all');
  });

  it('reapplies filter state on hashchange (e.g. on-page anchor link)', () => {
    const container = buildDom();
    initServicesFilter(container);
    // Initial state is "all"
    expect(container.dataset.viewMode).toBe('all');

    // Hash changes externally — e.g. the user clicks an on-page link with a
    // category anchor, manually edits the URL hash, or an external script
    // mutates location.hash. history.replaceState from the filter itself
    // does not fire hashchange, so this test dispatches it manually.
    navigateAndDispatchHashChange('/services#athletic');

    expectSingleModeWithVisibleGroup(container, 'athletic');
  });

  it('prefers the changed hash over an existing ?service= query param on hashchange', () => {
    // User lands on /services?service=competition-prep — filter resolves to
    // bodybuilding via the service-to-category map.
    setLocation('?service=competition-prep', '');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');
    const bodybuildingGroup = container.querySelector<HTMLElement>(
      '[data-category-group="bodybuilding"]',
    );
    assertNotNull(bodybuildingGroup);
    expect(bodybuildingGroup.classList.contains('hidden')).toBe(false);

    // Hash changes to #athletic while the ?service= param is still in the URL.
    // The user's current intent is the hash, so athletic must win.
    navigateAndDispatchHashChange('/services?service=competition-prep#athletic');

    const athleticGroup = container.querySelector<HTMLElement>('[data-category-group="athletic"]');
    assertNotNull(athleticGroup);
    expect(athleticGroup.classList.contains('hidden')).toBe(false);
    expect(bodybuildingGroup.classList.contains('hidden')).toBe(true);
  });

  it('does not scroll the viewport on hashchange', () => {
    // Cold-load path with no deep-link → the init path does not scroll.
    const container = buildDom();
    initServicesFilter(container);
    const scrollSpy = vi.mocked(Element.prototype.scrollIntoView);
    // Isolate the hashchange path itself from any init-path side effects —
    // we're asserting the hashchange handler does not scroll, not the init
    // handler.
    scrollSpy.mockClear();

    // User clicks an on-page #athletic anchor (or edits the URL, etc.).
    // The viewport has already been positioned by the browser's anchor
    // jump; a second controller-initiated scroll would fight the user's
    // own navigation.
    navigateAndDispatchHashChange('/services#athletic');
    // Advance past any deferred scroll timer that a cold-load would use.
    vi.advanceTimersByTime(500);

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('cleans up window hashchange listener on astro:before-swap', () => {
    const container = buildDom();
    initServicesFilter(container);

    // Simulate View Transition navigation leaving the page
    document.dispatchEvent(new CustomEvent('astro:before-swap'));

    // After cleanup, a fresh hashchange must not mutate the now-detached container.
    // Save the current state to prove nothing changed.
    const viewModeBefore = container.dataset.viewMode;
    navigateAndDispatchHashChange('/services#athletic');

    // If the listener was not aborted, view-mode would have flipped to 'single'
    // and the athletic group would have been revealed.
    expect(container.dataset.viewMode).toBe(viewModeBefore);
  });

  it('service-ID hash wins over category-ID hash when both would match', () => {
    // Simulate a hypothetical future where a service is registered with the
    // same ID as an existing category ("bodybuilding" service under the
    // athletic category, say). Current domain data doesn't have this, but
    // the resolver must pick the service interpretation (more specific)
    // rather than the category interpretation. Without this contract, a
    // collision would flip the filter to the wrong category on deep-link.
    const container = document.createElement('div');
    container.dataset.servicesFilter = '';
    container.dataset.serviceMap = JSON.stringify({
      ...SERVICE_MAP,
      bodybuilding: 'athletic', // service-ID 'bodybuilding' lives under athletic
    });
    container.innerHTML = `
      <div role="toolbar" aria-labelledby="filter-label">
        <button type="button" data-category-button="all" aria-pressed="true" tabindex="0">All</button>
        <button type="button" data-category-button="bodybuilding" aria-pressed="false" tabindex="-1">Bodybuilding</button>
        <button type="button" data-category-button="athletic" aria-pressed="false" tabindex="-1">Athletic</button>
        <button type="button" data-category-button="wellness" aria-pressed="false" tabindex="-1">Wellness</button>
      </div>
      <div data-category-group="bodybuilding" id="category-group-bodybuilding"></div>
      <div data-category-group="athletic" id="category-group-athletic">
        <div id="service-bodybuilding">Bodybuilding Service Card</div>
      </div>
      <div data-category-group="wellness" id="category-group-wellness"></div>
    `;
    document.body.appendChild(container);

    setLocation('', '#bodybuilding');
    initServicesFilter(container);

    // Service-ID interpretation wins: filter is athletic, service target is bodybuilding.
    const athleticGroup = container.querySelector<HTMLElement>('[data-category-group="athletic"]');
    assertNotNull(athleticGroup);
    expect(athleticGroup.classList.contains('hidden')).toBe(false);
    const bodybuildingGroup = container.querySelector<HTMLElement>(
      '[data-category-group="bodybuilding"]',
    );
    assertNotNull(bodybuildingGroup);
    expect(bodybuildingGroup.classList.contains('hidden')).toBe(true);
  });

  it('empty hash on hashchange restores the unfiltered view', () => {
    // User lands on #wellness, then manually strips the hash.
    setLocation('', '#wellness');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');

    navigateAndDispatchHashChange('/services');

    expect(container.dataset.viewMode).toBe('all');
  });

  it('unknown hash on hashchange is a no-op (preserves current state)', () => {
    // User lands on #athletic, then triggers a hashchange to an unknown
    // value (extension-inserted anchor, typo, etc.). The resolver must
    // treat unknown as "don't know what you meant, don't touch anything"
    // rather than resetting to All.
    setLocation('', '#athletic');
    const container = buildDom();
    initServicesFilter(container);
    expect(container.dataset.viewMode).toBe('single');

    navigateAndDispatchHashChange('/services#not-a-thing');

    // State preserved — still single-mode athletic.
    expectSingleModeWithVisibleGroup(container, 'athletic');
  });

  it('triggers quiz-highlight for deep-linked service after delay', () => {
    setLocation('?service=competition-prep', '');
    const container = buildDom();
    initServicesFilter(container);

    // Scroll+highlight are scheduled via setTimeout chains.
    vi.advanceTimersByTime(100 + 400 + 10);
    const card = document.getElementById('service-competition-prep');
    assertNotNull(card);
    expect(card.classList.contains('quiz-highlight')).toBe(true);

    vi.advanceTimersByTime(3000 + 10);
    expect(card.classList.contains('quiz-highlight')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation (toolbar pattern — focus only, no activation)
// ---------------------------------------------------------------------------

describe('initServicesFilter — keyboard navigation', () => {
  it('ArrowRight moves focus to the next button without activating it', () => {
    const container = buildDom();
    initServicesFilter(container);
    const allBtn = container.querySelector<HTMLButtonElement>('[data-category-button="all"]');
    const bodyBtn = container.querySelector<HTMLButtonElement>(
      '[data-category-button="bodybuilding"]',
    );
    assertNotNull(allBtn);
    assertNotNull(bodyBtn);

    allBtn.focus();
    allBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement).toBe(bodyBtn);
    expect(bodyBtn.getAttribute('tabindex')).toBe('0');
    expect(allBtn.getAttribute('tabindex')).toBe('-1');
    // Pressed state did NOT move — activation requires click/Enter/Space
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    expect(bodyBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('Home jumps focus to the first button', () => {
    const container = buildDom();
    initServicesFilter(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-category-button]');
    pressKeyOnButton(buttons, buttons.length - 1, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('End jumps focus to the last button', () => {
    const container = buildDom();
    initServicesFilter(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-category-button]');
    pressKeyOnButton(buttons, 0, 'End');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('ArrowLeft wraps from first to last', () => {
    const container = buildDom();
    initServicesFilter(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-category-button]');
    pressKeyOnButton(buttons, 0, 'ArrowLeft');
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// parseServiceMap defensive paths
// ---------------------------------------------------------------------------
// parseServiceMap is an internal helper, so these tests exercise it through
// initServicesFilter and the data-service-map attribute. They verify that
// malformed payloads degrade silently rather than throwing — the documented
// contract in parseServiceMap's JSDoc.

describe('initServicesFilter — parseServiceMap defensive paths', () => {
  it('tolerates a missing data-service-map attribute', () => {
    const container = buildDom();
    delete container.dataset.serviceMap;
    expect(() => initServicesFilter(container)).not.toThrow();
    expect(container.dataset.filterInitialized).toBe('true');
  });

  it('tolerates malformed JSON in data-service-map', () => {
    const container = buildDom();
    container.dataset.serviceMap = '{not:valid-json';
    expect(() => initServicesFilter(container)).not.toThrow();
    expect(container.dataset.filterInitialized).toBe('true');
  });

  it('tolerates a JSON array where an object is expected', () => {
    const container = buildDom();
    container.dataset.serviceMap = JSON.stringify(['bodybuilding', 'athletic']);
    expect(() => initServicesFilter(container)).not.toThrow();
    expect(container.dataset.filterInitialized).toBe('true');
  });

  it('drops non-string values during parse, so their keys no longer resolve', () => {
    const container = buildDom();
    container.dataset.serviceMap = JSON.stringify({
      'numeric-value': 42,
      'competition-prep': 'bodybuilding',
    });
    // Deep-link the key whose value is non-string. The parser drops that
    // entry, so the deep-link silently degrades to the "All" view rather
    // than coercing 42 to a category id.
    setLocation('?service=numeric-value', '');
    expect(() => initServicesFilter(container)).not.toThrow();
    expect(container.dataset.viewMode).toBe('all');
  });
});
