/**
 * Parse a display string like "500+", "98%", or "3" into a numeric
 * target and a suffix string for counter animations.
 *
 * Used at build time in Astro templates to set `data-countup-target`
 * and `data-countup-suffix` attributes. The client-side observer reads
 * these data attributes instead of parsing rendered text at runtime.
 *
 * @see {@link ~/components/layout/ScrollAnimations.astro} for the observer
 *
 * @example
 * ```ts
 * parseCounterValue('500+')  // { target: 500, suffix: '+' }
 * parseCounterValue('98%')   // { target: 98,  suffix: '%' }
 * parseCounterValue('3')     // { target: 3,   suffix: '' }
 * parseCounterValue('1,200') // { target: 1200, suffix: '' }
 * parseCounterValue('500 +') // { target: 500, suffix: '+' }  (whitespace trimmed)
 * ```
 *
 * Limitations (YAGNI — not needed for current data):
 * - Prefixes like "$500" are silently dropped (no prefix field)
 * - Decimals like "1.5x" become 15 (integer-only parsing)
 * If these cases arise, extend with a regex-based approach.
 */
export function parseCounterValue(value: string): { target: number; suffix: string } {
  const digits = value.replace(/[^0-9]/g, '');
  const target = Number.parseInt(digits, 10);
  // Suffix = everything after the last digit, trimmed for safety
  const lastDigitIndex = value.search(/[0-9][^0-9]*$/);
  const suffix = lastDigitIndex >= 0 ? value.slice(lastDigitIndex + 1).trim() : '';

  return { target: Number.isNaN(target) ? 0 : target, suffix };
}
