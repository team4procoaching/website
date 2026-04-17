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
  container.setAttribute('data-services-filter', '');
  container.dataset.serviceMap = JSON.stringify(SERVICE_MAP);
  container.innerHTML = `
    <div role="toolbar" aria-labelledby="filter-label">
      <button type="button" data-category-button="all" aria-pressed="true" tabindex="0">All</button>
      <button type="button" data-category-button="bodybuilding" aria-pressed="false" tabindex="-1">Bodybuilding</button>
      <button type="button" data-category-button="athletic" aria-pressed="false" tabindex="-1">Athletic</button>
      <button type="button" data-category-button="wellness" aria-pressed="false" tabindex="-1">Wellness</button>
    </div>
    <div data-category-group="bodybuilding" id="category-group-bodybuilding">
      <div id="service-competition-prep">Competition Prep Card</div>
      <div id="service-off-season">Off-Season Card</div>
    </div>
    <div data-category-group="athletic" id="category-group-athletic">
      <div id="service-competition-ready">Competition Ready Card</div>
    </div>
    <div data-category-group="wellness" id="category-group-wellness">
      <div id="service-get-lean">Get Lean Card</div>
    </div>
  `;
  document.body.appendChild(container);
  return container;
}

function setLocation(search: string, hash: string): void {
  // jsdom allows direct assignment to window.location.search/hash
  window.history.replaceState(null, '', `/services${search}${hash}`);
}

beforeEach(() => {
  vi.useFakeTimers();
  setLocation('', '');
  // jsdom does not implement scrollIntoView; stub so controller calls don't throw.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.initialFilter;
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

  it('clears html[data-initial-filter] after taking over visibility authority', () => {
    document.documentElement.dataset.initialFilter = 'bodybuilding';
    const container = buildDom();
    initServicesFilter(container);
    expect(document.documentElement.dataset.initialFilter).toBeUndefined();
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
    expect(window.location.hash).toBe('#bodybuilding');
    allBtn.click();
    expect(window.location.hash).toBe('');
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
    expect(container.dataset.viewMode).toBe('single');
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="wellness"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
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
    expect(container.dataset.viewMode).toBe('single');
    expect(
      container
        .querySelector<HTMLElement>('[data-category-group="wellness"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
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
    const lastBtn = buttons[buttons.length - 1];
    lastBtn.focus();
    lastBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('End jumps focus to the last button', () => {
    const container = buildDom();
    initServicesFilter(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-category-button]');
    const firstBtn = buttons[0];
    firstBtn.focus();
    firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('ArrowLeft wraps from first to last', () => {
    const container = buildDom();
    initServicesFilter(container);
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-category-button]');
    const firstBtn = buttons[0];
    firstBtn.focus();
    firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });
});
