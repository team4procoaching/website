/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNotNull } from '~/test-utils/assertions';
import { CONTACT_FORM_SELECTION_STORAGE_KEY } from '~/utils/contactFormStorage';
import { readAndApplyContactFormSelection } from './thanksSelectionReader';

// ---------------------------------------------------------------------------
// sessionStorage stub — mirrors the contactFormController.test.ts pattern.
// jsdom ships a sessionStorage but stubbing the global lets us assert on
// the underlying Map directly and avoids cross-test bleed.
// ---------------------------------------------------------------------------

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixture — mirrors ThanksSelectionSummary.astro's output. Session-heading
// variant is default-visible; subscription-heading variant is default-hidden;
// the wrapper is default-hidden and the placeholders are empty.
// ---------------------------------------------------------------------------

function buildSummaryFixture(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-thanks-selection-summary', '');
  wrapper.className = 'mb-8 hidden';
  wrapper.innerHTML = `
    <div>
      <p data-restate-heading="session">Here is what you booked:</p>
      <p data-restate-heading="subscription" class="hidden">Here is the service you asked about:</p>
      <p data-restate-service></p>
      <p data-restate-config></p>
      <p data-restate-price></p>
    </div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}

function setStorage(payload: unknown): void {
  mockStorage.set(CONTACT_FORM_SELECTION_STORAGE_KEY, JSON.stringify(payload));
}

function setStorageRaw(raw: string): void {
  mockStorage.set(CONTACT_FORM_SELECTION_STORAGE_KEY, raw);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('thanksSelectionReader', () => {
  it('renders the full triple, applies the session heading, and unhides the summary', () => {
    setStorage({ service: 'posing', duration: 60, package: 5 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    const configEl = summary.querySelector<HTMLElement>('[data-restate-config]');
    const priceEl = summary.querySelector<HTMLElement>('[data-restate-price]');
    const sessionHeading = summary.querySelector<HTMLElement>('[data-restate-heading="session"]');
    const subscriptionHeading = summary.querySelector<HTMLElement>(
      '[data-restate-heading="subscription"]',
    );
    assertNotNull(serviceEl);
    assertNotNull(configEl);
    assertNotNull(priceEl);
    assertNotNull(sessionHeading);
    assertNotNull(subscriptionHeading);

    expect(serviceEl.textContent).toBe('Posing & Stage Presence');
    expect(configEl.textContent).toBe('5 sessions · 60 minutes each');
    expect(priceEl.textContent).toBe('€745');
    expect(sessionHeading.classList.contains('hidden')).toBe(false);
    expect(subscriptionHeading.classList.contains('hidden')).toBe(true);
    expect(summary.classList.contains('hidden')).toBe(false);

    // Read-once-and-clear.
    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it('renders {service}-only for a session service with empty config/price placeholders and unhides', () => {
    setStorage({ service: 'posing' });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    const configEl = summary.querySelector<HTMLElement>('[data-restate-config]');
    const priceEl = summary.querySelector<HTMLElement>('[data-restate-price]');
    const sessionHeading = summary.querySelector<HTMLElement>('[data-restate-heading="session"]');
    const subscriptionHeading = summary.querySelector<HTMLElement>(
      '[data-restate-heading="subscription"]',
    );
    assertNotNull(serviceEl);
    assertNotNull(configEl);
    assertNotNull(priceEl);
    assertNotNull(sessionHeading);
    assertNotNull(subscriptionHeading);

    expect(serviceEl.textContent).toBe('Posing & Stage Presence');
    expect(configEl.textContent).toBe('');
    expect(priceEl.textContent).toBe('');
    // Session-service → session heading variant.
    expect(sessionHeading.classList.contains('hidden')).toBe(false);
    expect(subscriptionHeading.classList.contains('hidden')).toBe(true);
    expect(summary.classList.contains('hidden')).toBe(false);
    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it('renders {service}-only for a subscription service with the subscription heading', () => {
    setStorage({ service: 'get-lean' });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    const sessionHeading = summary.querySelector<HTMLElement>('[data-restate-heading="session"]');
    const subscriptionHeading = summary.querySelector<HTMLElement>(
      '[data-restate-heading="subscription"]',
    );
    assertNotNull(serviceEl);
    assertNotNull(sessionHeading);
    assertNotNull(subscriptionHeading);

    expect(serviceEl.textContent).toBe('Get Lean');
    expect(sessionHeading.classList.contains('hidden')).toBe(true);
    expect(subscriptionHeading.classList.contains('hidden')).toBe(false);
    expect(summary.classList.contains('hidden')).toBe(false);
    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
  });

  it('does not mutate the summary when the sessionStorage entry is absent', () => {
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    const configEl = summary.querySelector<HTMLElement>('[data-restate-config]');
    assertNotNull(serviceEl);
    assertNotNull(configEl);
    expect(serviceEl.textContent).toBe('');
    expect(configEl.textContent).toBe('');
    expect(summary.classList.contains('hidden')).toBe(true);
  });

  it('clears the entry and skips rendering on malformed JSON', () => {
    setStorageRaw('not json');
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    assertNotNull(serviceEl);
    expect(serviceEl.textContent).toBe('');
  });

  it('rejects a tampered `package` value rather than silently downgrading to {service}', () => {
    // package: 999 is outside the canonical PackageSize union. The
    // contract is rejection, not fall-back to {service}-only.
    setStorage({ service: 'posing', duration: 60, package: 999 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    assertNotNull(serviceEl);
    expect(serviceEl.textContent).toBe('');
  });

  it('rejects a tampered `duration` value rather than silently downgrading to {service}', () => {
    // duration: 45 is outside the canonical DurationMinutes union (30/60).
    // Symmetric with the tampered-package case — both numeric fields narrow
    // against canonical guards from `~/data/services`.
    setStorage({ service: 'posing', duration: 45, package: 5 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    assertNotNull(serviceEl);
    expect(serviceEl.textContent).toBe('');
  });

  it('rejects a triple-bearing payload that names a subscription service', () => {
    // A `{service, duration, package}` payload only makes sense for
    // `SessionService`-typed services. A tampered payload naming a
    // subscription service with a triple must be rejected outright —
    // otherwise `applyTripleSelection` reaches `formatTotalPrice`, which
    // throws on a non-session input as a contract-violation guard. The
    // reader's "best-effort, return silently" contract requires the
    // rejection to happen at `parsePayload`.
    setStorage({ service: 'get-lean', duration: 60, package: 5 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
    const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
    assertNotNull(serviceEl);
    expect(serviceEl.textContent).toBe('');
  });

  it('rejects a tampered `service` (unknown ServiceId)', () => {
    setStorage({ service: 'fake-service' });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
  });

  it('rejects a partial triple ({service, duration} without package)', () => {
    setStorage({ service: 'posing', duration: 60 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
  });

  it('rejects the symmetric partial triple ({service, package} without duration)', () => {
    // Symmetric coverage for the `hasDuration !== hasPackage` XOR check.
    // A regression that reverses the XOR would only be caught by one of
    // the two directions; this case pins the opposite-direction shape.
    setStorage({ service: 'posing', package: 5 });
    const summary = buildSummaryFixture();

    readAndApplyContactFormSelection(document.body);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
    expect(summary.classList.contains('hidden')).toBe(true);
  });

  it('clears the entry and returns silently when the summary component is absent from root', () => {
    setStorage({ service: 'posing' });
    // No buildSummaryFixture call — the root is empty.

    expect(() => readAndApplyContactFormSelection(document.body)).not.toThrow();
    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
  });
});
