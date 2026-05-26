/**
 * Thanks-page selection-restate reader — consumes the contact-form
 * sessionStorage carry written by `wireSessionStorageCarry` in
 * `contactFormController` and applies it to the `ThanksSelectionSummary`
 * component's `data-restate-*` placeholders before removing the wrapper's
 * `hidden` class.
 *
 * Read-once-and-clear: the sessionStorage entry is removed unconditionally
 * before the function returns — on a successful render, on a parse failure,
 * on a tampered payload, on a missing component, on every path. A second
 * visit to `/contact/thanks` (refresh, bookmark, stale tab) must never
 * resurrect a prior submission's restate.
 *
 * Tampered or partial payloads are rejected, not silently downgraded — the
 * sessionStorage carry is editable from devtools and a partial-triple
 * payload is a signal something is wrong, not a hint to fall back to the
 * `{service}`-only branch. Rejection clears the entry and returns silently.
 *
 * Wired by `pages/contact/thanks.astro`'s module `<script>` via
 * `bootstrapOnLoad`. Renders narrower than the writer's
 * `ContactFormSelectionCarry`: a reader-local `ReadOnlySelection` type
 * guards against silent contract widening if the writer ever grows
 * additional fields the thanks page would not want to display.
 *
 * XSS-safety: all DOM writes go through `.textContent` and
 * `classList`; the reader never touches `innerHTML`.
 */

import {
  type DurationMinutes,
  getServiceById,
  isPackageSize,
  type PackageSize,
  type ServiceId,
} from '~/data/services';
import { CONTACT_FORM_SELECTION_STORAGE_KEY } from '~/scripts/contactFormController';
import {
  formatConfigurationLine,
  formatTotalPrice,
  isKnownServiceId,
} from '~/utils/configuratorContext';

/**
 * Reader-local payload shape. Structurally identical to the writer's
 * `ContactFormSelectionCarry` today, but the reader names its own contract
 * so a future widening on the writer side does not silently change what
 * the thanks page renders.
 */
type ReadOnlySelection =
  | { service: ServiceId; duration: DurationMinutes; package: PackageSize }
  | { service: ServiceId };

/**
 * Parse and validate a raw sessionStorage payload into a
 * {@link ReadOnlySelection}. Returns `null` on any validation failure —
 * unknown service id, partial triple, tampered numeric field, wrong shape.
 *
 * Partial / tampered triples are rejected outright rather than downgraded
 * to `{service}`-only: a payload that names a `package` value outside the
 * canonical set indicates devtools tampering or a stale writer contract,
 * neither of which we want to render.
 */
function parsePayload(raw: unknown): ReadOnlySelection | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  const service = candidate.service;
  if (typeof service !== 'string' || !isKnownServiceId(service)) return null;

  const hasDuration = candidate.duration !== undefined;
  const hasPackage = candidate.package !== undefined;

  if (!hasDuration && !hasPackage) {
    return { service };
  }

  // Partial triple — both must be present or neither.
  if (hasDuration !== hasPackage) return null;

  const duration = candidate.duration;
  const packageValue = candidate.package;

  // `package` is a numeric session-count constrained by `isPackageSize`;
  // `duration` is a finite positive number (no runtime guard exported
  // from `~/data/services` — keep the local check tight).
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  if (typeof packageValue !== 'number' || !isPackageSize(packageValue)) {
    return null;
  }

  return {
    service,
    duration: duration as DurationMinutes,
    package: packageValue,
  };
}

/**
 * Toggle the `hidden` class on the two `[data-restate-heading="…"]`
 * variants so exactly one heading is visible.
 */
function applyHeadingVariant(root: HTMLElement, variant: 'session' | 'subscription'): void {
  const sessionHeading = root.querySelector<HTMLElement>('[data-restate-heading="session"]');
  const subscriptionHeading = root.querySelector<HTMLElement>(
    '[data-restate-heading="subscription"]',
  );
  if (!sessionHeading || !subscriptionHeading) return;
  sessionHeading.classList.toggle('hidden', variant !== 'session');
  subscriptionHeading.classList.toggle('hidden', variant !== 'subscription');
}

/**
 * Apply a parsed `{service}`-only selection to the summary DOM. Sets the
 * service name, flips the heading variant according to the service's
 * `pricingModel`, leaves `[data-restate-config]` and `[data-restate-price]`
 * empty, and unhides the wrapper.
 */
function applyServiceOnlySelection(summary: HTMLElement, service: ServiceId): void {
  const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
  if (serviceEl) serviceEl.textContent = getServiceById(service).name;

  const variant =
    getServiceById(service).pricingModel === 'subscription' ? 'subscription' : 'session';
  applyHeadingVariant(summary, variant);

  summary.classList.remove('hidden');
}

/**
 * Apply a parsed `{service, duration, package}` selection to the summary
 * DOM. Always uses the same heading-variant logic as the service-only
 * branch — the triple is only ever written for session services today, but
 * the variant selection stays data-driven so a future writer widening does
 * not desynchronise the heading.
 */
function applyTripleSelection(
  summary: HTMLElement,
  selection: { service: ServiceId; duration: DurationMinutes; package: PackageSize },
): void {
  const serviceEl = summary.querySelector<HTMLElement>('[data-restate-service]');
  if (serviceEl) serviceEl.textContent = getServiceById(selection.service).name;

  const configEl = summary.querySelector<HTMLElement>('[data-restate-config]');
  if (configEl) configEl.textContent = formatConfigurationLine(selection);

  const priceEl = summary.querySelector<HTMLElement>('[data-restate-price]');
  if (priceEl) priceEl.textContent = formatTotalPrice(selection);

  const variant =
    getServiceById(selection.service).pricingModel === 'subscription' ? 'subscription' : 'session';
  applyHeadingVariant(summary, variant);

  summary.classList.remove('hidden');
}

/**
 * Read the contact-form selection carry from sessionStorage, validate it,
 * and apply it to the `ThanksSelectionSummary` rendered under `root`. The
 * sessionStorage entry is removed before the function returns on every
 * path (read-once-and-clear). Best-effort: malformed JSON, tampered
 * payloads, or a missing summary component all return silently.
 *
 * @param root Container queried for `[data-thanks-selection-summary]` —
 *   typically `document.body` in production, a synthetic fixture root in
 *   tests.
 */
export function readAndApplyContactFormSelection(root: HTMLElement): void {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable (private browsing, storage full).
    // Nothing to clear, nothing to render.
    return;
  }

  // Read-once-and-clear: remove the entry up front so every return path
  // below is already clean, regardless of parse/validate outcome.
  try {
    sessionStorage.removeItem(CONTACT_FORM_SELECTION_STORAGE_KEY);
  } catch {
    // Mirror the read fallback — proceed without erroring out.
  }

  if (raw === null) return;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return;
  }

  const selection = parsePayload(parsedJson);
  if (selection === null) return;

  const summary = root.querySelector<HTMLElement>('[data-thanks-selection-summary]');
  if (!summary) return;

  if ('duration' in selection) {
    applyTripleSelection(summary, selection);
  } else {
    applyServiceOnlySelection(summary, selection.service);
  }
}
