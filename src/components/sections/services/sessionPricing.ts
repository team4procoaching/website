/**
 * Pricing-string formatters for the session-service configurator (ADR-0051).
 *
 * A session-service detail page renders a `SessionConfigurator` with three
 * package cards; each card shows a package total, a per-session anchor, and
 * a savings caption comparing the package to the single-session price for the
 * same duration. The three formatters here own the display rules for those
 * strings: English-locale comma separator for the total, whole-euro
 * truncation for the per-session line, and the Q6 caption template for the
 * savings line. The display rules are extracted from the rendering
 * component so they can be covered by pure-function Vitest tests
 * independently of the Astro render path (pure-function layer per
 * ADR-0037; mirrors `sessionConfigurationCopy.ts`).
 *
 * Savings math uses untruncated numeric amounts — the truncation in
 * {@link formatPerSessionPrice} is a display-only concession (Q15) and
 * never feeds back into the savings caption (Q6).
 */

/** ISO 4217 EUR symbol. Scoped to EUR while no other currency is offered. */
const EURO_SYMBOL = '€';

/** Per-session anchor suffix — matches the catalog's `/ session` wording. */
const PER_SESSION_SUFFIX = ' / session';

/**
 * Format a whole-euro amount as an English-locale display string with a
 * thousands separator, e.g., `1149` → `'€1,149'` and `149` → `'€149'`.
 * No decimal places: package totals are always whole euros (Q14).
 */
function formatTotalPrice(amount: number): string {
  return `${EURO_SYMBOL}${amount.toLocaleString('en-US')}`;
}

/**
 * Format the per-session anchor line for a package, truncating to whole
 * euros so the line never carries cents (Q15). For `formatPerSessionPrice(1149, 5)`
 * the math is `1149 / 5 = 229.80`, which truncates to `229`, and the
 * rendered string is `'€229 / session'`.
 *
 * `sessionCount` is the package's session count (1, 5, or 10 today; see
 * {@link import('~/data/services').PackageSize}); a value of `0` is
 * impossible under the type constraint and is not guarded here.
 */
function formatPerSessionPrice(totalAmount: number, sessionCount: number): string {
  const perSession = Math.floor(totalAmount / sessionCount);
  return `${EURO_SYMBOL}${perSession.toLocaleString('en-US')}${PER_SESSION_SUFFIX}`;
}

/**
 * Format the Q6 savings caption: a `Save €<delta>` headline followed by
 * the explicit anchor math, e.g.,
 *
 *     formatSavingsCaption(1149, 249, 5)
 *     // → 'Save €96 — 5 × €249 single-session = €1,245'
 *
 * The savings delta is the untruncated difference between the single-
 * session total (`singleSessionPrice * sessionCount`) and the package
 * total (`packageTotal`); both anchor amounts are rendered with the same
 * English-locale comma separator used by {@link formatTotalPrice}.
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
): string {
  const singleSessionTotal = singleSessionPrice * sessionCount;
  const savings = singleSessionTotal - packageTotal;
  const savingsLabel = `${EURO_SYMBOL}${savings.toLocaleString('en-US')}`;
  const singleSessionLabel = `${EURO_SYMBOL}${singleSessionPrice.toLocaleString('en-US')}`;
  const singleSessionTotalLabel = `${EURO_SYMBOL}${singleSessionTotal.toLocaleString('en-US')}`;
  return `Save ${savingsLabel} — ${sessionCount} × ${singleSessionLabel} single-session = ${singleSessionTotalLabel}`;
}

export { formatPerSessionPrice, formatSavingsCaption, formatTotalPrice };
