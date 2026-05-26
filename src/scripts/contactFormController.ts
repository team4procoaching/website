/**
 * ContactForm controller — manages the contact-form prefill flow.
 *
 * Extracted from `ContactForm.astro`'s inline `<script>` to make each
 * concern individually readable, modifiable, and testable. The Astro
 * component imports and calls {@link initSingleContactForm} — this
 * module owns all runtime logic.
 *
 * Source priority — Configurator wins over Quiz:
 *   1. Configurator deep-link (`?service=…&duration=…min&package=…`)
 *      validated by `parseConfiguratorParams`. Non-null result populates
 *      the Configurator context box and short-circuits the quiz branch
 *      so quiz hidden fields are never injected on a Configurator
 *      submission.
 *   2. Quiz answers from sessionStorage (persisted by QuizModal across
 *      navigations) merged with URL parameter fallback.
 *   3. Bare `?service=<id>` (ServiceCard prefill) flows through the quiz
 *      branch — `parseConfiguratorParams` returns null on missing
 *      `duration`/`package`, the quiz branch runs but `isFromQuiz` stays
 *      false without `experience`/`timeline`, and only the dropdown
 *      preselect happens.
 *
 * Quiz context is cleared from sessionStorage after successful form
 * submission, not after rendering — so the summary survives page
 * refreshes.
 *
 * Init runs via `bootstrapOnLoad` (ADR-0026), which dispatches on both
 * the cold-load fallback and the View Transitions page-load event so
 * users arriving from email or social links — including the Configurator
 * deep-link, which is by definition a cold-load entry point — get an
 * interactive form even if `<ClientRouter />` is absent or disabled.
 * {@link initSingleContactForm} is idempotent via a
 * `data-contact-form-initialized` guard.
 *
 * Concerns (as named functions, not one monolith):
 * - {@link resolveQuizAnswers} — merge sessionStorage answers with URL params
 * - {@link preselectService} — set the service `<select>` to a known ID
 * - {@link wireServiceValidation} — soft-validate the required service field
 * - {@link populateConfiguratorBox} — fill and unhide the Configurator card
 * - {@link unhideStaticLine} — swap the editable service `<select>` for the
 *   read-only static line on a Configurator landing
 * - {@link applyHeadlineMode} — flip the contact-section heading between
 *   conversational and transactional variants
 * - {@link populateQuizSummary} — fill and unhide the Quiz summary card,
 *   plus inject the hidden Netlify fields
 * - {@link wireSessionStorageCarry} — write the visitor's current dropdown
 *   selection (plus optional configurator triple) to sessionStorage on
 *   submit, so the thanks page can restate it
 */

import {
  type DurationMinutes,
  getServiceById,
  isDurationMinutes,
  isPackageSize,
  type PackageSize,
  type ServiceId,
} from '~/data/services';
import {
  buildChangeSelectionHref,
  type ConfiguratorParams,
  formatConfigurationLine,
  formatTotalPrice,
  isKnownServiceId,
  parseConfiguratorParams,
} from '~/utils/configuratorContext';
import {
  clearQuizAnswers,
  getAnswerLabel,
  loadQuizAnswers,
  QUIZ_FIELDS,
  type QuizAnswers,
} from '~/utils/quizContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Display config for the quiz summary card */
const SUMMARY_FIELDS: readonly { readonly key: keyof QuizAnswers; readonly label: string }[] = [
  { key: 'service', label: 'Interested in' },
  { key: 'experience', label: 'Experience' },
  { key: 'timeline', label: 'Timeline' },
];

/**
 * sessionStorage key for the contact-form selection carry — the payload
 * the thanks-page reader consumes (read-once-and-clear). Namespaced with
 * the same `team4pro-` prefix as `quizContext`'s `STORAGE_KEY`.
 */
export const CONTACT_FORM_SELECTION_STORAGE_KEY = 'team4pro-contact-form-selection';

/**
 * On-wire payload shape written to
 * {@link CONTACT_FORM_SELECTION_STORAGE_KEY} on submit. Discriminated by
 * the presence of the configurator triple: a known {@link ServiceId}
 * alone when the visitor did not arrive via Configurator (or changed the
 * dropdown afterwards), or the full `{service, duration, package}` when
 * the configurator URL parameters round-trip and still match the current
 * dropdown selection. The reader on the thanks page declares its own
 * narrower `ReadOnlySelection` type — this export is the writer's
 * contract surface for consumers that need to type the payload.
 */
export type ContactFormSelectionCarry =
  | { service: ServiceId; duration: DurationMinutes; package: PackageSize }
  | { service: ServiceId };

// ---------------------------------------------------------------------------
// Quiz answer resolution
// ---------------------------------------------------------------------------

/**
 * Merge sessionStorage answers with URL parameter fallback.
 * sessionStorage values take priority over URL params.
 */
function resolveQuizAnswers(): QuizAnswers | null {
  const stored = loadQuizAnswers();
  const params = new URLSearchParams(window.location.search);

  // Check if any quiz data exists in either source
  const hasStored = stored && Object.values(stored).some(Boolean);
  const hasParams = QUIZ_FIELDS.some((p) => params.has(p));
  if (!hasStored && !hasParams) return null;

  const merged: QuizAnswers = {};
  for (const key of QUIZ_FIELDS) {
    merged[key] = stored?.[key] || params.get(key) || undefined;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Service dropdown
// ---------------------------------------------------------------------------

/**
 * Preselect the service `<select>` to the given service ID if the option
 * exists. Used by both the Configurator and Quiz branches; safe to call
 * with any string — `CSS.escape` neutralises selector-special characters.
 */
function preselectService(form: HTMLFormElement, serviceId: string): void {
  const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
  if (!select) return;
  const option = select.querySelector<HTMLOptionElement>(
    `option[value="${CSS.escape(serviceId)}"]`,
  );
  if (option) select.value = serviceId;
}

/**
 * Soft-validate the required service `<select>`: override the browser-
 * native validation message with the project copy on the `invalid`
 * event, and clear the override on `input` so re-submission is not
 * blocked once the visitor picks a service or "Not sure yet". The
 * gate itself is the HTML5 `required` attribute on the select — this
 * function only customises the message.
 */
function wireServiceValidation(form: HTMLFormElement): void {
  const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
  if (!select) return;
  select.addEventListener('invalid', () => {
    select.setCustomValidity("Please choose a service or 'Not sure yet'.");
  });
  select.addEventListener('input', () => {
    select.setCustomValidity('');
  });
}

// ---------------------------------------------------------------------------
// Configurator branch
// ---------------------------------------------------------------------------

/**
 * Populate the Configurator context box from the parsed parameters and
 * unhide it. XSS-safe: writes derived strings via `.textContent` and the
 * back-link via `.setAttribute('href', …)`, never `innerHTML`.
 */
function populateConfiguratorBox(form: HTMLFormElement, params: ConfiguratorParams): void {
  const wrapper = form.querySelector<HTMLElement>('[data-configurator-summary]');
  if (!wrapper) return;

  const service = getServiceById(params.service);
  const serviceEl = wrapper.querySelector<HTMLElement>('[data-cfg-service]');
  if (serviceEl) serviceEl.textContent = service.name;

  const configEl = wrapper.querySelector<HTMLElement>('[data-cfg-config]');
  if (configEl) configEl.textContent = formatConfigurationLine(params);

  const priceEl = wrapper.querySelector<HTMLElement>('[data-cfg-price]');
  if (priceEl) priceEl.textContent = formatTotalPrice(params);

  const linkEl = wrapper.querySelector<HTMLAnchorElement>('[data-cfg-href]');
  if (linkEl) linkEl.setAttribute('href', buildChangeSelectionHref(params));

  wrapper.classList.remove('hidden');
}

/**
 * Swap the editable service `<select>` for the read-only static line: hide
 * the `data-service-select-wrapper`, unhide the `data-service-locked-wrapper`,
 * and write the resolved service name into `[data-locked-service-name]` via
 * `.textContent` (XSS-safe). Called only from the Configurator branch — the
 * locked line is the deep-link's read-only display, never the default.
 */
function unhideStaticLine(form: HTMLFormElement, serviceId: ServiceId): void {
  const selectWrapper = form.querySelector<HTMLElement>('[data-service-select-wrapper]');
  const lockedWrapper = form.querySelector<HTMLElement>('[data-service-locked-wrapper]');
  const nameEl = form.querySelector<HTMLElement>('[data-locked-service-name]');
  if (!selectWrapper || !lockedWrapper || !nameEl) return;

  nameEl.textContent = getServiceById(serviceId).name;
  selectWrapper.classList.add('hidden');
  lockedWrapper.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Headline toggle
// ---------------------------------------------------------------------------

/**
 * Toggle the contact-section heading between its two variants by flipping
 * the `hidden` class on the `<span data-contact-headline-mode="…">` siblings
 * rendered by `Contact.astro`. The conversational variant is default-visible
 * and the transactional variant default-hidden; on a Configurator deep-link
 * this swaps them. The siblings live on the surrounding `Contact` section,
 * not inside the form, so the query is document-scoped.
 */
function applyHeadlineMode(mode: 'conversational' | 'transactional'): void {
  const headlineSpans = document.querySelectorAll<HTMLElement>('[data-contact-headline-mode]');
  for (const span of headlineSpans) {
    const isActive = span.dataset.contactHeadlineMode === mode;
    span.classList.toggle('hidden', !isActive);
  }
}

// ---------------------------------------------------------------------------
// Quiz branch
// ---------------------------------------------------------------------------

/**
 * Populate the quiz summary card from the resolved answers and unhide it.
 * Injects hidden fields for every populated answer so Netlify receives the
 * quiz context on submission. Defensive against partial re-renders: any
 * previously injected `[data-quiz-hidden]` fields are removed first.
 *
 * Returns early without unhiding the card when none of the configured
 * `SUMMARY_FIELDS` resolves to a labelled value (empty summary is worse
 * than no summary).
 */
function populateQuizSummary(form: HTMLFormElement, quizAnswers: QuizAnswers): void {
  const summaryEl = form.querySelector<HTMLElement>('[data-quiz-summary]');
  if (!summaryEl) return;

  // Remove any previously injected hidden fields (defensive against partial re-renders)
  form.querySelectorAll('[data-quiz-hidden]').forEach((el) => {
    el.remove();
  });

  // Inject hidden fields for Netlify submission
  for (const [key, value] of Object.entries(quizAnswers)) {
    if (value) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = `quiz-${key}`;
      hidden.value = value;
      hidden.setAttribute('data-quiz-hidden', '');
      form.appendChild(hidden);
    }
  }

  // Build summary items
  const items = SUMMARY_FIELDS.flatMap(({ key, label }) => {
    const value = quizAnswers[key];
    return value ? [{ label, value: getAnswerLabel(key, value) }] : [];
  });

  if (items.length === 0) return;

  const dl = summaryEl.querySelector<HTMLDListElement>('[data-quiz-summary-rows]');
  if (!dl) return;

  // Populate summary rows (DOM API for XSS safety)
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'flex justify-between text-sm';

    const dt = document.createElement('dt');
    dt.className = 'text-foreground-600 dark:text-gray-400';
    dt.textContent = item.label;

    const dd = document.createElement('dd');
    dd.className = 'text-foreground-950 font-medium dark:text-white';
    dd.textContent = item.value;

    row.appendChild(dt);
    row.appendChild(dd);
    dl.appendChild(row);
  }

  summaryEl.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Selection carry (submit-time writer)
// ---------------------------------------------------------------------------

/**
 * Attach a submit listener that writes a
 * {@link ContactFormSelectionCarry} payload to sessionStorage when the
 * visitor's current dropdown value is a known {@link ServiceId}, so the
 * thanks page can restate the selection. Four sub-branches:
 *
 * 1. **Known ServiceId with a matching configurator triple in the URL** —
 *    the triple round-trips and the dropdown still names the same service
 *    → write `{service, duration, package}`. The dropdown-match check is
 *    the gate: if the visitor changed the dropdown after landing via a
 *    configurator deep-link, the dropdown wins and the carry drops to
 *    `{service}` only.
 * 2. **Known ServiceId without a matching configurator triple** — quiz
 *    landing, bare `?service=` landing, manual selection, or
 *    configurator-then-dropdown-change → write `{service}`.
 * 3. **`'not-sure-yet'` selection** — do not write, do not clear any
 *    pre-existing carry; the read-once-and-clear semantics on the reader
 *    side are responsible for not picking up a stale carry from a prior
 *    submission.
 * 4. **Blank selection** — do not write; HTML5 `required` typically
 *    prevents this submit from reaching here, but the writer is
 *    defensive anyway.
 *
 * Read-and-clear is the reader's responsibility — the writer never
 * removes the key.
 */
function wireSessionStorageCarry(form: HTMLFormElement): void {
  form.addEventListener('submit', () => {
    const select = form.querySelector<HTMLSelectElement>('[data-service-select]');
    if (!select) return;
    const selectValue = select.value;
    if (!isKnownServiceId(selectValue)) return;

    const params = parseConfiguratorParams(new URLSearchParams(window.location.search));
    const payload: ContactFormSelectionCarry =
      params !== null &&
      params.service === selectValue &&
      isDurationMinutes(params.duration) &&
      isPackageSize(params.package)
        ? { service: selectValue, duration: params.duration, package: params.package }
        : { service: selectValue };

    try {
      sessionStorage.setItem(CONTACT_FORM_SELECTION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage may be unavailable (private browsing, storage full);
      // the thanks page falls back to the generic copy in that case.
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize a single ContactForm instance. Idempotent — skips if already
 * initialized via the `data-contact-form-initialized` guard attribute.
 * Called by `ContactForm.astro`'s `<script>` on `astro:page-load` and
 * cold-load via {@link bootstrapOnLoad}.
 */
export function initSingleContactForm(form: HTMLFormElement): void {
  if (form.hasAttribute('data-contact-form-initialized')) return;
  form.setAttribute('data-contact-form-initialized', '');

  // Clear quiz context on successful form submission, not on render —
  // wired unconditionally so the cleanup fires regardless of which
  // branch (Configurator, Quiz, ServiceCard prefill, bare /contact)
  // populated the form. sessionStorage cleanup belongs to the form's
  // submission lifecycle, not to a specific render path. Idempotent
  // via the form-level `data-contact-form-initialized` guard above.
  form.addEventListener('submit', () => {
    clearQuizAnswers();
  });

  // Wire the service-required custom message before either branch runs —
  // the validation is independent of Configurator vs. Quiz preselect, and
  // an early return in the Configurator branch must not skip it.
  wireServiceValidation(form);

  // Wire the sessionStorage carry writer unconditionally for the same
  // reason — the writer reads the dropdown's current value at submit
  // time and is independent of which branch (Configurator / Quiz /
  // ServiceCard / bare) populated the form on init.
  wireSessionStorageCarry(form);

  // --- Configurator branch (wins over Quiz when both sets of params land) ---
  const configuratorParams = parseConfiguratorParams(new URLSearchParams(window.location.search));
  if (configuratorParams !== null) {
    preselectService(form, configuratorParams.service);
    populateConfiguratorBox(form, configuratorParams);
    unhideStaticLine(form, configuratorParams.service);
    applyHeadlineMode('transactional');
    return;
  }

  // --- Quiz / ServiceCard branch (Configurator parse returned null) ---
  const quizAnswers = resolveQuizAnswers();

  // Preselect service dropdown — covers both the quiz flow (sessionStorage)
  // and direct ServiceCard links (URL `?service=` parameter, read by
  // `resolveQuizAnswers`).
  const serviceId = quizAnswers?.service;
  if (serviceId) preselectService(form, serviceId);

  // --- Quiz summary (only when quiz-specific context is available) ---
  const isFromQuiz = quizAnswers && (quizAnswers.experience || quizAnswers.timeline);
  if (!isFromQuiz || !quizAnswers) return;

  populateQuizSummary(form, quizAnswers);
}
