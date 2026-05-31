/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertNotNull } from '~/test-utils/assertions';
import { installSessionStorageStub } from '~/test-utils/sessionStorageStub';
import { CONTACT_FORM_SELECTION_STORAGE_KEY } from '~/utils/contactFormStorage';
import { initSingleContactForm } from './contactFormController';

// sessionStorage stub — quizContext reads via `sessionStorage.getItem`,
// the controller writes via `clearQuizAnswers` on submit.
const mockStorage = installSessionStorageStub();

// jsdom does not implement `CSS.escape` on the global; ContactForm's
// service-preselect path uses it to neutralise selector-special characters
// in the URL-derived serviceId. Install a minimal pass-through escape — the
// service IDs the tests use are all `[a-z-]+` (safe CSS identifiers).
// @ts-expect-error — jsdom-only runtime patch
globalThis.CSS ??= { escape: (value: string) => value.replaceAll('"', String.raw`\"`) };

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
  form.dataset.contactForm = '';
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
    <div data-subscription-summary class="hidden">
      <p>Your selected program</p>
      <p data-sub-service></p>
      <p data-sub-price></p>
      <a href="" data-sub-detail-href hidden>See full program details</a>
      <a href="/contact">Ask about a different service</a>
    </div>
    <div data-service-select-wrapper>
      <select data-service-select name="service" required>
        <option value="">Select a service…</option>
        <option value="not-sure-yet">Not sure yet</option>
        <option value="posing">Posing &amp; Stage Presence</option>
        <option value="get-lean">Get Lean</option>
        <option value="competition-prep">Competition Prep</option>
        <option value="off-season">Off-Season Muscle Building</option>
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
 * Build the three `<span data-contact-headline-mode="…">` siblings rendered
 * by `Contact.astro` outside the form. Mirrors the corrected SSG markup
 * per ADR-0061: the conversational sibling ships visible on load (dominant
 * no-JS default), the transactional and program siblings ship hidden. The
 * controller actively sets `hidden` on all three after init; tests assert
 * which sibling carries the `hidden` class once init has run.
 */
function buildHeadlineSpans(): {
  conversational: HTMLElement;
  transactional: HTMLElement;
  program: HTMLElement;
} {
  const heading = document.createElement('h2');
  heading.innerHTML = `
    <span data-contact-headline-mode="conversational">Tell us about your goals</span>
    <span data-contact-headline-mode="transactional" class="hidden">Confirm your booking request</span>
    <span data-contact-headline-mode="program" class="hidden">Let's talk about your program</span>
  `;
  document.body.appendChild(heading);
  const conversational = heading.querySelector<HTMLElement>(
    '[data-contact-headline-mode="conversational"]',
  );
  const transactional = heading.querySelector<HTMLElement>(
    '[data-contact-headline-mode="transactional"]',
  );
  const program = heading.querySelector<HTMLElement>('[data-contact-headline-mode="program"]');
  assertNotNull(conversational);
  assertNotNull(transactional);
  assertNotNull(program);
  return { conversational, transactional, program };
}

function setLocation(search: string): void {
  globalThis.history.replaceState(null, '', `/contact${search}`);
}

const QUIZ_STORAGE_KEY = 'team4pro-quiz-answers';

function seedQuizAnswers(answers: Record<string, string>): void {
  mockStorage.set(QUIZ_STORAGE_KEY, JSON.stringify(answers));
}

/**
 * Dispatches a synthetic `submit` event on the form. `cancelable: true`
 * so listeners can `preventDefault()`; `bubbles: true` to match real
 * submit semantics. jsdom does not navigate on submit, so the listener
 * is the only observable side effect.
 */
function dispatchSubmit(form: HTMLFormElement): void {
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

/**
 * Build and init a form, optionally override the service dropdown to
 * `service`, dispatch submit, and return the raw selection-carry entry that
 * the submit listener wrote (or `null` if it wrote nothing). Bundles the
 * arrange→dispatch→read scaffolding the carry-on-submit tests share; each
 * test keeps only its `setLocation` / storage-seed arrangement (before the
 * call) and its assertion on the returned value. When `service` is omitted
 * the dropdown keeps whatever value init left it at (e.g. a configurator
 * preselect).
 */
function initAndSubmit(service?: string): string | null {
  const form = buildForm();
  initSingleContactForm(form);

  if (service !== undefined) {
    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    select.value = service;
  }

  dispatchSubmit(form);

  return sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
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
    expect(form.dataset.contactFormInitialized).toBeUndefined();

    initSingleContactForm(form);

    expect(form.dataset.contactFormInitialized).toBe('');
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

  it('preselects the service from a bare session `?service=<id>` URL parameter', () => {
    // A bare *session* id (`posing`, no configurator triple) is not strong
    // intent: it preselects the editable dropdown and flows through the
    // quiz/ServiceCard branch without locking. (A bare *subscription* id is
    // strong intent — covered by the subscription-branch tests below.)
    setLocation('?service=posing');
    const form = buildForm();

    initSingleContactForm(form);

    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('posing');

    // The dropdown stays editable — no lock on the bare-session path.
    const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
    assertNotNull(selectWrapper);
    expect(selectWrapper.classList.contains('hidden')).toBe(false);

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
    expect(priceText).toContain('1,149'); // posing.packages[(60, 5)].price (discounted matrix)

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

    // Per ADR-0061 the conversational sibling ships visible on load and only
    // the transactional sibling ships hidden; the controller unhides exactly
    // the conversational variant on the non-Configurator branches.
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

  it('unhides the conversational headline on a bare session `?service=<id>` landing', () => {
    setLocation('?service=posing');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // ServiceCard prefill with a bare *session* id (`?service=posing`, no
    // configurator triple) is NOT strong intent — `parseConfiguratorParams`
    // returns null on missing `duration`/`package` and the subscription arm
    // rejects it on `pricingModel !== 'subscription'`, so it falls through to
    // the conversational headline. (A bare *subscription* id is strong intent
    // and lands on the program headline — covered separately above.)
    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
    expect(headline.program.classList.contains('hidden')).toBe(true);
  });

  // --- Subscription prefill branch (strong intent) ---

  it('populates the subscription box, both links, locked line, and program headline on a guard-true subscription landing', () => {
    setLocation('?service=competition-prep');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // Dropdown preselected to the subscription service.
    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('competition-prep');

    // Subscription box unhides; the configurator box stays hidden.
    const subSummary = form.querySelector<HTMLElement>('[data-subscription-summary]');
    assertNotNull(subSummary);
    expect(subSummary.classList.contains('hidden')).toBe(false);

    const cfgSummary = form.querySelector<HTMLElement>('[data-configurator-summary]');
    assertNotNull(cfgSummary);
    expect(cfgSummary.classList.contains('hidden')).toBe(true);

    // Service name + data-driven monthly-anchor price line.
    expect(subSummary.querySelector('[data-sub-service]')?.textContent).toBe('Competition Prep');
    const priceText = subSummary.querySelector('[data-sub-price]')?.textContent;
    expect(priceText).toBe('From €299/month (3 month minimum)');

    // competition-prep passes hasCompleteDetailContent — the program-details
    // link is unhidden with its href pointing at the detail page.
    const detailLink = subSummary.querySelector<HTMLAnchorElement>('[data-sub-detail-href]');
    assertNotNull(detailLink);
    expect(detailLink.hasAttribute('hidden')).toBe(false);
    expect(detailLink.getAttribute('href')).toBe('/services/competition-prep');

    // Locked line swaps in; the editable dropdown wrapper hides.
    const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
    assertNotNull(selectWrapper);
    expect(selectWrapper.classList.contains('hidden')).toBe(true);

    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(false);
    expect(form.querySelector('[data-locked-service-name]')?.textContent).toBe('Competition Prep');

    // Program headline active; conversational and transactional hidden.
    expect(headline.program.classList.contains('hidden')).toBe(false);
    expect(headline.conversational.classList.contains('hidden')).toBe(true);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
  });

  it('suppresses the program-details link on a guard-false subscription landing (off-season)', () => {
    setLocation('?service=off-season');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    const subSummary = form.querySelector<HTMLElement>('[data-subscription-summary]');
    assertNotNull(subSummary);
    expect(subSummary.classList.contains('hidden')).toBe(false);

    // Service name + monthly anchor from the off-season monthly tier.
    expect(subSummary.querySelector('[data-sub-service]')?.textContent).toBe(
      'Off-Season Muscle Building',
    );
    expect(subSummary.querySelector('[data-sub-price]')?.textContent).toBe(
      'From €249/month (2 month minimum)',
    );

    // off-season fails hasCompleteDetailContent (no lead) — /services/off-season
    // is not built, so the program-details link MUST stay hidden with an empty
    // href rather than point at a 404.
    const detailLink = subSummary.querySelector<HTMLAnchorElement>('[data-sub-detail-href]');
    assertNotNull(detailLink);
    expect(detailLink.hasAttribute('hidden')).toBe(true);
    expect(detailLink.getAttribute('href')).toBe('');

    // The different-service link (from the shell) is still present and shown.
    const differentServiceLink = [...subSummary.querySelectorAll<HTMLAnchorElement>('a')].find(
      (a) => a.textContent?.includes('Ask about a different service'),
    );
    expect(differentServiceLink?.getAttribute('href')).toBe('/contact');

    // Locked line still swaps in (the box renders regardless of the guard).
    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(false);

    // Program headline active.
    expect(headline.program.classList.contains('hidden')).toBe(false);
  });

  it('never surfaces a one-time tier in the subscription box', () => {
    setLocation('?service=competition-prep');
    const form = buildForm();

    initSingleContactForm(form);

    // competition-prep one-time tiers are €1,599 / €2,899 — the box reads the
    // monthly tier only, so neither must leak into the rendered price line.
    const priceText = form.querySelector('[data-sub-price]')?.textContent ?? '';
    expect(priceText).toContain('€299');
    expect(priceText).not.toContain('€1,599');
    expect(priceText).not.toContain('€2,899');
  });

  it('keeps a bare session `?service=posing` editable with no locked line and no box (AC-4 regression guard)', () => {
    // A bare session id (no configurator triple) is NOT strong intent: the
    // dropdown preselects but stays editable, no locked line, no box, and the
    // conversational headline. Firing the lock here would remove the editable
    // dropdown and the "Not sure yet" escape.
    setLocation('?service=posing');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // Dropdown preselected but editable.
    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    assertNotNull(select);
    expect(select.value).toBe('posing');

    const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
    assertNotNull(selectWrapper);
    expect(selectWrapper.classList.contains('hidden')).toBe(false);

    // No locked line.
    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(true);

    // No box (both context boxes stay hidden).
    const subSummary = form.querySelector<HTMLElement>('[data-subscription-summary]');
    assertNotNull(subSummary);
    expect(subSummary.classList.contains('hidden')).toBe(true);

    const cfgSummary = form.querySelector<HTMLElement>('[data-configurator-summary]');
    assertNotNull(cfgSummary);
    expect(cfgSummary.classList.contains('hidden')).toBe(true);

    // Conversational headline.
    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.program.classList.contains('hidden')).toBe(true);
    expect(headline.transactional.classList.contains('hidden')).toBe(true);
  });

  it('leaves the form untouched on a `?service=not-sure-yet` landing', () => {
    setLocation('?service=not-sure-yet');
    const headline = buildHeadlineSpans();
    const form = buildForm();

    initSingleContactForm(form);

    // 'not-sure-yet' is not a known service id — no lock, no box, conversational.
    const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
    assertNotNull(lockedWrapper);
    expect(lockedWrapper.classList.contains('hidden')).toBe(true);

    const subSummary = form.querySelector<HTMLElement>('[data-subscription-summary]');
    assertNotNull(subSummary);
    expect(subSummary.classList.contains('hidden')).toBe(true);

    expect(headline.conversational.classList.contains('hidden')).toBe(false);
    expect(headline.program.classList.contains('hidden')).toBe(true);
  });

  // --- sessionStorage selection carry on submit ---

  it('writes {service} to sessionStorage when a known ServiceId is selected without a configurator triple', () => {
    const stored = initAndSubmit('get-lean');

    assertNotNull(stored);
    expect(JSON.parse(stored)).toEqual({ service: 'get-lean' });
  });

  it('writes {service, duration, package} when the configurator triple matches the dropdown', () => {
    setLocation('?service=posing&duration=60min&package=5');

    // Configurator init preselects the dropdown to 'posing' — no manual
    // override needed. The dropdown-match check passes; the full triple
    // is written.
    const stored = initAndSubmit();

    assertNotNull(stored);
    expect(JSON.parse(stored)).toEqual({ service: 'posing', duration: 60, package: 5 });
  });

  it('drops the configurator triple and writes {service} when the visitor changes the dropdown', () => {
    setLocation('?service=posing&duration=60min&package=5');

    // Visitor lands via configurator then picks a different service in
    // the dropdown — the dropdown wins and the carry must not claim the
    // stale configurator triple.
    const stored = initAndSubmit('get-lean');

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

    const stored = initAndSubmit('not-sure-yet');

    expect(stored).toBe(JSON.stringify({ service: 'get-lean' }));
  });

  it('does not write when the service dropdown is left blank', () => {
    // HTML5 `required` would normally block this; defensive coverage.
    const stored = initAndSubmit('');

    expect(stored).toBeNull();
  });
});
