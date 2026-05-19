/**
 * Pricing-string formatters for the session-service configurator (ADR-0051).
 *
 * A session-service detail page renders a `SessionConfigurator` with three
 * package cards; each card shows a package total, a per-session anchor, and
 * a savings caption comparing the package to the single-session price for
 * the same duration. The per-card total is read directly from
 * `SessionPackage.price` (the data layer's pre-rendered display string), so
 * the two formatters here own only the per-session anchor and the Q6
 * savings caption.
 *
 * Both formatters take the per-row `currency` field as a parameter and
 * delegate symbol rendering to `Intl.NumberFormat`, mirroring the pattern
 * in {@link import('~/utils/configuratorContext').formatTotalPrice}. The
 * formatters never hardcode a currency symbol — adding a second currency
 * to the data model needs only the type widening, not a formatter rewrite.
 *
 * The display rules are extracted from the rendering component so they can
 * be covered by pure-function Vitest tests independently of the Astro
 * render path (pure-function layer per ADR-0037; mirrors
 * `sessionConfigurationCopy.ts`).
 *
 * Savings math uses untruncated numeric amounts — the truncation in
 * {@link formatPerSessionPrice} is a display-only concession (Q15) and
 * never feeds back into the savings caption (Q6).
 */
import type { SessionPackage } from '~/data/services';

/** Per-session anchor suffix — matches the catalog's `/ session` wording. */
const PER_SESSION_SUFFIX = ' / session';

/**
 * Format the per-session anchor line for a package, truncating to whole
 * units so the line never carries fractional amounts (Q15). For
 * `formatPerSessionPrice(1149, 5, 'EUR')` the math is `1149 / 5 = 229.80`,
 * which truncates to `229`, and the rendered string is `'€229 / session'`.
 *
 * `sessionCount` is the package's session count (1, 5, or 10 today; see
 * {@link import('~/data/services').PackageSize}); a value of `0` is
 * impossible under the type constraint and is not guarded here.
 *
 * `currency` is the package's ISO 4217 code; `Intl.NumberFormat` renders
 * the symbol so adding a second currency to the data model does not
 * require a formatter change.
 */
function formatPerSessionPrice(
  totalAmount: number,
  sessionCount: number,
  currency: SessionPackage['currency'],
): string {
  const perSession = Math.floor(totalAmount / sessionCount);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return `${formatter.format(perSession)}${PER_SESSION_SUFFIX}`;
}

/**
 * Format the Q6 savings caption: a `Save <delta>` headline followed by
 * the explicit anchor math, e.g.,
 *
 *     formatSavingsCaption(1149, 249, 5, 'EUR')
 *     // → 'Save €96 — 5 × €249 single-session = €1,245'
 *
 * The savings delta is the untruncated difference between the single-
 * session total (`singleSessionPrice * sessionCount`) and the package
 * total (`packageTotal`); all three anchor amounts are rendered with the
 * same `Intl.NumberFormat` instance keyed on the per-row `currency`.
 *
 * The caller decides whether to render the caption — the 1-session card
 * has no savings (`packageTotal === singleSessionPrice * 1`) so its
 * consumer (`PackageCard`) does not call this function. When called with
 * a non-positive delta, the function still returns a structurally well-
 * formed string; suppressing that case is the caller's responsibility.
 */
function formatSavingsCaption(
  packageTotal: number,
  singleSessionPrice: number,
  sessionCount: number,
  currency: SessionPackage['currency'],
): string {
  const singleSessionTotal = singleSessionPrice * sessionCount;
  const savings = singleSessionTotal - packageTotal;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  const savingsLabel = formatter.format(savings);
  const singleSessionLabel = formatter.format(singleSessionPrice);
  const singleSessionTotalLabel = formatter.format(singleSessionTotal);
  return `Save ${savingsLabel} — ${sessionCount} × ${singleSessionLabel} single-session = ${singleSessionTotalLabel}`;
}

export { formatPerSessionPrice, formatSavingsCaption };
