/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNotNull } from '~/test-utils/assertions';
import { CONTACT_FORM_SELECTION_STORAGE_KEY } from '~/utils/contactFormStorage';
import { initSingleContactForm } from './contactFormController';

// ---------------------------------------------------------------------------
// sessionStorage stub — quizContext reads via `sessionStorage.getItem`,
// the controller writes via `clearQuizAnswers` on submit. Mirror the
// quizModalController.test.ts pattern.
// ---------------------------------------------------------------------------

const mockStorage = new Map<string, string>();

// jsdom does not implement `CSS.escape` on the global; ContactForm's
// service-preselect path uses it to neutralise selector-special characters
// in the URL-derived serviceId. Install a minimal pass-through escape — the
// service IDs the tests use are all `[a-z-]+` (safe CSS identifiers).
if (typeof globalThis.CSS === 'undefined') {
  // @ts-expect-error — jsdom-only runtime patch
  globalThis.CSS = { escape: (value: string) => value.replace(/"/g, '\\"') };
}

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
  globalThis.history.replaceState(null, '', '/contact');
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixture — minimal DOM matching ContactForm.astro's output
// ---------------------------------------------------------------------------

/**
 * Build a `<form data-contact-form>` matching the markup ContactForm.astro
 * renders: the service `<select>` inside its wrapper, the
 * `data-service-locked-wrapper` sibling carrying `ServiceLockedLine`'s
 * `[data-locked-service-name]` placeholder, the two context-box wrappers
 * (QuizContextBox + ConfiguratorContextBox), and the data-attribute hooks
 * the controller queries. Service IDs cover one SessionService (`posing`)
 * for the Configurator branch plus a generic catalog ID (`get-lean`) for
 * the quiz / `?service=` branch.
 */
function buildForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.setAttribute('data-contact-form', '');
  form.setAttribute('name', 'contact');
  form.innerHTML = `
    <div data-quiz-summary class="hidden">
      <p>Based on your quiz answers:</p>
      <dl data-quiz-summary-rows></dl>
    </div>
    <div data-configurator-summary class="hidden">
      <p>Your selected package</p>
      <p data-cfg-service></p>
      <p data-cfg-config></p>
      <p data-cfg-price></p>
      <a href="" data-cfg-href>Change package</a>
    </div>
    <div data-service-select-wrapper>
      <select data-service-select name="service" required>
        <option value="">Select a service…</option>
        <option value="not-sure-yet">Not sure yet</option>
        <option value="posing">Posing &amp; Stage Presence</option>
        <option value="get-lean">Get Lean</option>
        <option value="competition-prep">Competition Prep</option>
      </select>
    </div>
    <div data-service-locked-wrapper class="hidden">
      <p><span>Service:</span> <span data-locked-service-name></span></p>
    </div>
  `;
  document.body.appendChild(form);
  return form;
}

/**
 * Build the two `<span data-contact-headline-mode="…">` siblings rendered
 * by `Contact.astro` outside the form. Both siblings ship default-hidden
 * per ADR-0059's render-then-init contract; the controller unhides
 * exactly one after init runs. Tests assert which sibling carries the
 * `hidden` class after init.
 */
function buildHeadlineSpans(): { conversational: HTMLElement; transactional: HTMLElement } {
  const heading = document.createElement('h2');
  heading.innerHTML = `
    <span data-contact-headline-mode="conversational" class="hidden">Tell us about your goals</span>
    <span data-contact-headline-mode="transactional" class="hidden">Confirm your booking request</span>
  `;
  document.body.appendChild(heading);
  const conversational = heading.querySelector<HTMLElement>(
    '[data-contact-headline-mode="conversational"]',
  );
  const transactional = heading.querySelector<HTMLElement>(
    '[data-contact-headline-mode="transactional"]',
  );
  assertNotNull(conversational);
  assertNotNull(transactional);
  return { conversational, transactional };
}

function setLocation(search: string): void {
  globalThis.history.replaceState(null, '', `/contact${search}`);
}

const QUIZ_STORAGE_KEY = 'team4pro-quiz-answers';

function seedQuizAnswers(answers: Record<string, string>): void {
  mockStorage.set(QUIZ_STORAGE_KEY, JSON.stringify(answers));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('contactFormController', () => {
  // --- Idempotent init guard ---

  it('is idempotent — second init call is a no-op', () => {
    seedQuizAnswers({ service: 'get-lean', experience: 'beginner', timeline: 'soon' });
    const form = buildForm();

    initSingleContactForm(form);
    initSingleContactForm(form);

    // A second init must not re-inject the hidden fields. If the guard
    // failed, we would see two copies of every `quiz-*` hidden input.
    const hiddenFields = form.querySelectorAll('input[type="hidden"][data-quiz-hidden]');
    expect(hiddenFields).toHaveLength(3); // service, experience, timeline
  });

  it('sets the initialization guard attribute on first init', () => {
    const form = buildForm();
    expect(form.hasAttribute('data-contact-form-initialized')).toBe(false);

    initSingleContactForm(form);

    expect(form.hasAttribute('data-contact-form-initialized')).toBe(true);
  });

  // --- Quiz prefill branch ---

  it('prefills the service select and shows the quiz summary on a quiz landing', () => {
    seedQuizAnswers({ service: 'get-lean', experience: 'beginner', timeline: 'soon' });
    const form = buildForm();

    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('get-lean');

    const summary = form.querySelector<HTMLElement>('[data-quiz-summary]');
    assertNotNull(summary);
    expect(summary.classList.contains('hidden')).toBe(false);

    const rows = summary.querySelectorAll('[data-quiz-summary-rows] > div');
    expect(rows).toHaveLength(3); // service + experience + timeline

    // Hidden fields for Netlify submission
    expect(form.querySelector('input[name="quiz-service"]')?.getAttribute('value')).toBe(
      'get-lean',
    );
    expect(form.querySelector('input[name="quiz-experience"]')?.getAttribute('value')).toBe(
      'beginner',
    );
    expect(form.querySelector('input[name="quiz-timeline"]')?.getAttribute('value')).toBe('soon');
  });

  it('preselects the service from a bare `?service=<id>` URL parameter', () => {
    setLocation('?service=get-lean');
    const form = buildForm();

    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('get-lean');

    // Bare ?service= without experience/timeline must not unhide the
    // quiz summary — the visitor did not finish the quiz.
    const summary = form.querySelector<HTMLElement>('[data-quiz-summary]');
    assertNotNull(summary);
    expect(summary.classList.contains('hidden')).toBe(true);
  });

  // --- Configurator prefill branch ---

  it('prefills the service select and shows the configurator summary on a configurator landing', () => {
    setLocation('?service=posing&duration=60min&package=5');
    const form = buildForm();

    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('posing');

    const cfgSummary = form.querySelector<HTMLElement>('[data-configurator-summary]');
    assertNotNull(cfgSummary);
    expect(cfgSummary.classList.contains('hidden')).toBe(false);

    expect(cfgSummary.querySelector('[data-cfg-service]')?.textContent).toBe(
      'Posing & Stage Presence',
    );
    expect(cfgSummary.querySelector('[data-cfg-config]')?.textContent).toBe(
      '5 sessions · 60 minutes each',
    );

    const priceText = cfgSummary.querySelector('[data-cfg-price]')?.textContent;
    expect(priceText).toContain('745'); // 149 × 5, locale-formatted

    const href = cfgSummary.querySelector('[data-cfg-href]')?.getAttribute('href');
    expect(href).toContain('service=posing');
    expect(href).toContain('duration=60min');
    expect(href).toContain('package=5');
  });

  // --- Conflict resolution: Configurator wins over Quiz ---

  it('lets the configurator branch win when both Configurator and Quiz are present', () => {
    seedQuizAnswers({ service: 'get-lean', experience: 'beginner', timeline: 'soon' });
    setLocation('?service=posing&duration=60min&package=5');
    const form = buildForm();

    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('posing'); // Configurator service, not the quiz service

    const cfgSummary = form.querySelector<HTMLElement>('[data-configurator-summary]');
    assertNotNull(cfgSummary);
    expect(cfgSummary.classList.contains('hidden')).toBe(false);

    // Quiz summary must stay hidden — Configurator short-circuits the quiz branch.
    const quizSummary = form.querySelector<HTMLElement>('[data-quiz-summary]');
    assertNotNull(quizSummary);
    expect(quizSummary.classList.contains('hidden')).toBe(true);

    // No quiz hidden fields injected on a Configurator submission.
    const hiddenFields = form.querySelectorAll('input[data-quiz-hidden]');
    expect(hiddenFields).toHaveLength(0);
  });

  // --- Validation copy ---

  it('overrides the service-select validation message with the project copy', () => {
    const form = buildForm();
    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);

    // Browser fires `invalid` when checkValidity() fails on a required field
    // with an empty value. Dispatch it synthetically so the listener runs.
    select.dispatchEvent(new Event('invalid'));
    expect(select.validationMessage).toBe("Please choose a service or 'Not sure yet'.");

    // Re-selecting clears the custom message so re-submission is not blocked.
    select.value = 'get-lean';
    select.dispatchEvent(new Event('input'));
    expect(select.validationMessage).toBe('');
  });

  // --- Static-line swap + headline toggle (Configurator landing) ---

  it('swaps the static line in and flips the headline on a Configurator landing', () => {
    setLocation('?service=posing&duration=60min&package=5');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // Select wrapper hides; locked wrapper unhides.
    const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
    assertNotNull(selectWrapper);
    expect(selectWrapper.classList.contains('hidden')).toBe(true);

    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(false);

    // The locked-name placeholder carries the resolved Service.name.
    const nameEl = form.querySelector<HTMLElement>('[data-locked-service-name]');
    assertNotNull(nameEl);
    expect(nameEl.textContent).toBe('Posing & Stage Presence');

    // Headline flips to transactional: conversational hides, transactional unhides.
    expect(headline.conversational.classList.contains('hidden')).toBe(true);
    expect(headline.transactional.classList.contains('hidden')).toBe(false);
  });

  // --- Bare landing keeps the static line hidden + unhides the conversational headline ---

  it('leaves the static line hidden and unhides the conversational headline on a bare landing', () => {
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // Select wrapper stays visible; locked wrapper stays hidden.
    const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
    assertNotNull(selectWrapper);
    expect(selectWrapper.classList.contains('hidden')).toBe(false);

    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(true);

    // Both siblings ship default-hidden per ADR-0059; the controller
    // unhides exactly the conversational variant on the non-Configurator
    // branches.
    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
  });

  it('unhides the conversational headline on a quiz landing', () => {
    seedQuizAnswers({ service: 'get-lean', experience: 'beginner', timeline: 'soon' });
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // Symmetric assertion to the bare-landing case: the quiz branch lives
    // alongside the bare branch under the unconditional
    // `applyHeadlineMode('conversational')` call, so a regression that
    // moves the call into a guarded sub-branch would surface here.
    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
  });

  it('unhides the conversational headline on a bare `?service=<id>` landing', () => {
    setLocation('?service=get-lean');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // ServiceCard prefill (bare `?service=<id>`) flows through the
    // non-Configurator branch — `parseConfiguratorParams` returns null on
    // missing `duration`/`package`. The conversational headline applies.
    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
  });

  // --- sessionStorage selection carry on submit ---

  /**
   * Dispatches a synthetic `submit` event on the form. `cancelable: true`
   * so listeners can `preventDefault()`; `bubbles: true` to match real
   * submit semantics. jsdom does not navigate on submit, so the listener
   * is the only observable side effect.
   */
  function dispatchSubmit(form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  it('writes {service} to sessionStorage when a known ServiceId is selected without a configurator triple', () => {
    const form = buildForm();
    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    select.value = 'get-lean';

    dispatchSubmit(form);

    const stored = sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
    assertNotNull(stored);
    expect(JSON.parse(stored)).toEqual({ service: 'get-lean' });
  });

  it('writes {service, duration, package} when the configurator triple matches the dropdown', () => {
    setLocation('?service=posing&duration=60min&package=5');
    const form = buildForm();
    initSingleContactForm(form);

    // Configurator init preselects the dropdown to 'posing' — no manual
    // override needed. The dropdown-match check passes; the full triple
    // is written.
    dispatchSubmit(form);

    const stored = sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
    assertNotNull(stored);
    expect(JSON.parse(stored)).toEqual({ service: 'posing', duration: 60, package: 5 });
  });

  it('drops the configurator triple and writes {service} when the visitor changes the dropdown', () => {
    setLocation('?service=posing&duration=60min&package=5');
    const form = buildForm();
    initSingleContactForm(form);

    // Visitor lands via configurator then picks a different service in
    // the dropdown — the dropdown wins and the carry must not claim the
    // stale configurator triple.
    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    select.value = 'get-lean';

    dispatchSubmit(form);

    const stored = sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
    assertNotNull(stored);
    expect(JSON.parse(stored)).toEqual({ service: 'get-lean' });
  });

  it('does not write and does not clear a pre-existing carry when the visitor selects "Not sure yet"', () => {
    // Seed a pre-existing carry from a hypothetical earlier submission —
    // the writer must leave it untouched (the reader's read-and-clear
    // handles staleness on the receiving side).
    sessionStorage.setItem(
      CONTACT_FORM_SELECTION_STORAGE_KEY,
      JSON.stringify({ service: 'get-lean' }),
    );

    const form = buildForm();
    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    select.value = 'not-sure-yet';

    dispatchSubmit(form);

    const stored = sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
    expect(stored).toBe(JSON.stringify({ service: 'get-lean' }));
  });

  it('does not write when the service dropdown is left blank', () => {
    const form = buildForm();
    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    select.value = ''; // HTML5 `required` would normally block this; defensive.

    dispatchSubmit(form);

    expect(sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY)).toBeNull();
  });
});
