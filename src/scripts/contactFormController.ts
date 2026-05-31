/**
 * ContactForm controller — manages the contact-form prefill flow.
 *
 * Extracted from `ContactForm.astro`'s inline `<script>` to make each
 * concern individually readable, modifiable, and testable. The Astro
 * component imports and calls {@link initSingleContactForm} — this
 * module owns all runtime logic.
 *
 * Source priority — strong-intent deep-links win over Quiz:
 *   1. Configurator deep-link (`?service=…&duration=…min&package=…`)
 *      validated by `parseConfiguratorParams`. Non-null result populates
 *      the Configurator context box, locks the service line, flips the
 *      transactional headline, and short-circuits the quiz branch so quiz
 *      hidden fields are never injected on a Configurator submission.
 *   2. Subscription `?service=<id>` deep-link (a known service whose
 *      `pricingModel === 'subscription'`). Populates the subscription
 *      context box, locks the service line, flips the program headline,
 *      and short-circuits the quiz branch. This is the subscription
 *      strong-intent arm — parity with the Configurator treatment.
 *   3. Quiz answers from sessionStorage (persisted by QuizModal across
 *      navigations) merged with URL parameter fallback.
 *   4. Bare *session* `?service=<id>` (ServiceCard prefill, e.g.
 *      `?service=posing` with no configurator triple) flows through the
 *      quiz branch — it is NOT strong intent, so it only preselects the
 *      editable dropdown, keeps the conversational headline, and shows no
 *      locked line and no box. `parseConfiguratorParams` returns null on
 *      missing `duration`/`package`, the subscription arm rejects it on
 *      `pricingModel !== 'subscription'`, and `isFromQuiz` stays false
 *      without `experience`/`timeline`.
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
 * - {@link populateSubscriptionBox} — fill and unhide the subscription card
 *   (monthly anchor + conditional program-details link)
 * - {@link unhideStaticLine} — swap the editable service `<select>` for the
 *   read-only static line on a strong-intent landing (Configurator triple or
 *   subscription `?service=<id>`)
 * - {@link applyHeadlineMode} — flip the contact-section heading between the
 *   conversational, transactional, and program variants
 * - {@link populateQuizSummary} — fill and unhide the Quiz summary card,
 *   plus inject the hidden Netlify fields
 * - {@link wireSessionStorageCarry} — write the visitor's current dropdown
 *   selection (plus optional configurator triple) to sessionStorage on
 *   submit, so the thanks page can restate it
 */

import {
  type DurationMinutes,
  getServiceById,
  hasCompleteDetailContent,
  isDurationMinutes,
  isPackageSize,
  type PackageSize,
  type ServiceId,
  serviceDetailHref,
} from '~/data/services';
import {
  buildChangeSelectionHref,
  type ConfiguratorParams,
  formatConfigurationLine,
  formatTotalPrice,
  isKnownServiceId,
  parseConfiguratorParams,
  parseServiceIdParam,
} from '~/utils/configuratorContext';
import { CONTACT_FORM_SELECTION_STORAGE_KEY } from '~/utils/contactFormStorage';
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
  const params = new URLSearchParams(globalThis.location.search);

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
  const totalPrice = formatTotalPrice(params);
  if (priceEl && totalPrice !== null) priceEl.textContent = totalPrice;

  const linkEl = wrapper.querySelector<HTMLAnchorElement>('[data-cfg-href]');
  if (linkEl) linkEl.setAttribute('href', buildChangeSelectionHref(params));

  wrapper.classList.remove('hidden');
}

/**
 * Populate the subscription context box from a subscription service id and
 * unhide it. Writes the service name and a data-driven monthly-anchor price
 * line (`From <price><suffix> (<note>)`) read from the `monthly`-period
 * pricing entry — never a one-time tier — via `.textContent` (XSS-safe).
 *
 * The program-details link is conditional: its `href` is set and its
 * `hidden` attribute removed only when the service passes
 * {@link hasCompleteDetailContent}, so a subscription service without a
 * detail page (e.g. `off-season`) leaves the link suppressed rather than
 * pointing at a 404. The link ships present-but-`hidden` with an empty
 * `href`; this helper is the only writer.
 */
function populateSubscriptionBox(form: HTMLFormElement, serviceId: ServiceId): void {
  const wrapper = form.querySelector<HTMLElement>('[data-subscription-summary]');
  if (!wrapper) return;

  const service = getServiceById(serviceId);

  const serviceEl = wrapper.querySelector<HTMLElement>('[data-sub-service]');
  if (serviceEl) serviceEl.textContent = service.name;

  const monthly = service.pricing.find((option) => option.period === 'monthly');
  const priceEl = wrapper.querySelector<HTMLElement>('[data-sub-price]');
  if (priceEl && monthly) {
    const note = monthly.note ? ` (${monthly.note})` : '';
    priceEl.textContent = `From ${monthly.price}${monthly.suffix}${note}`;
  }

  const detailLink = wrapper.querySelector<HTMLAnchorElement>('[data-sub-detail-href]');
  if (detailLink && hasCompleteDetailContent(service)) {
    detailLink.setAttribute('href', serviceDetailHref(serviceId));
    detailLink.removeAttribute('hidden');
  }

  wrapper.classList.remove('hidden');
}

/**
 * Swap the editable service `<select>` for the read-only static line: hide
 * the `data-service-select-wrapper`, unhide the `data-service-locked-wrapper`,
 * and write the resolved service name into `[data-locked-service-name]` via
 * `.textContent` (XSS-safe). Called only from the two strong-intent arms —
 * the Configurator triple arm and the subscription `?service=<id>` arm — and
 * never from the bare-session path, so a bare `?service=posing` keeps its
 * editable dropdown. The locked line is the strong-intent landing's
 * read-only display, never the default.
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
 * Toggle the contact-section heading between its three variants by flipping
 * the `hidden` class on the `<span data-contact-headline-mode="…">` siblings
 * rendered by `Contact.astro`. Per ADR-0060 (Decisions 1 and 5), the
 * conversational sibling ships visible on load (the dominant case and no-JS
 * render path) and the transactional and program siblings ship hidden; this
 * helper toggles `hidden` on all siblings after init so exactly the active
 * variant is shown regardless of entry path (`transactional` on the
 * Configurator triple arm, `program` on the subscription arm,
 * `conversational` on every other branch). The siblings live on the
 * surrounding `Contact` section, not inside the form, so the query is
 * document-scoped.
 */
function applyHeadlineMode(mode: 'conversational' | 'transactional' | 'program'): void {
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
      hidden.dataset.quizHidden = '';
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

    const params = parseConfiguratorParams(new URLSearchParams(globalThis.location.search));
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
  if (form.dataset.contactFormInitialized !== undefined) return;
  form.dataset.contactFormInitialized = '';

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
  const configuratorParams = parseConfiguratorParams(
    new URLSearchParams(globalThis.location.search),
  );
  if (configuratorParams !== null) {
    preselectService(form, configuratorParams.service);
    populateConfiguratorBox(form, configuratorParams);
    unhideStaticLine(form, configuratorParams.service);
    applyHeadlineMode('transactional');
    return;
  }

  // --- Subscription strong-intent arm (a concrete subscription `?service=`) ---
  // A bare `?service=<id>` is strong intent only when the id is a known
  // subscription service; the locked line + program headline + subscription
  // box fire here. A bare *session* id (e.g. `?service=posing` with no
  // configurator triple) is NOT strong intent and falls through to the
  // editable Quiz/ServiceCard branch below — firing the lock there would
  // remove the editable dropdown and the "Not sure yet" escape.
  const serviceIdParam = parseServiceIdParam(new URLSearchParams(globalThis.location.search));
  if (serviceIdParam !== null && getServiceById(serviceIdParam).pricingModel === 'subscription') {
    preselectService(form, serviceIdParam);
    populateSubscriptionBox(form, serviceIdParam);
    unhideStaticLine(form, serviceIdParam);
    applyHeadlineMode('program');
    return;
  }

  // --- Quiz / ServiceCard branch (no strong-intent deep-link) ---
  // Per ADR-0060, the conversational sibling ships visible on load and the
  // transactional and program siblings ship hidden; the non-strong-intent
  // branches always want the conversational variant, regardless of whether
  // quiz prefill, bare session ServiceCard prefill, or a bare landing
  // populated the form. The controller still re-asserts the conversational
  // variant here so the early-return paths below (no quiz answers, no
  // quiz-specific context) leave the correct headline visible even after a
  // prior Configurator or subscription landing toggled in the transactional
  // or program variant during the same session.
  applyHeadlineMode('conversational');

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
