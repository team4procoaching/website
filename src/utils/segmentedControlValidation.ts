const isWhitespaceOnly = (v: string | undefined): boolean =>
  typeof v === 'string' && v.length > 0 && v.trim().length === 0;

/**
 * Validate the SegmentedControl labelling XOR contract: exactly one of
 * `ariaLabelledBy` or `ariaLabel` must be present and non-empty.
 * Empty strings and whitespace-only strings are rejected outright — they
 * would pass a naive truthiness check but produce an empty Accessible Name,
 * and the template binds the raw prop value to the DOM, so the
 * single-source-of-labelling invariant would be silently violated.
 *
 * Returns nothing on success; throws with a message that names the specific
 * prop and the specific violation (invalid value, whitespace-only, both
 * provided, neither provided) so failing tests and consumer stack traces
 * point directly at the fix. Extracted to a pure helper so the invariant
 * can be regression-tested without spinning up an Astro component render
 * environment. SegmentedControl itself calls this at the top of its template
 * frontmatter before rendering. Mirrors `validateFilterBarLabelling` because
 * both primitives carry the same accessible-name invariant.
 */
export function validateSegmentedControlLabelling(
  ariaLabelledBy: string | undefined,
  ariaLabel: string | undefined,
): void {
  if (ariaLabelledBy === '') {
    throw new Error(
      'SegmentedControl: ariaLabelledBy has invalid value (empty string); pass undefined to omit',
    );
  }
  if (ariaLabel === '') {
    throw new Error(
      'SegmentedControl: ariaLabel has invalid value (empty string); pass undefined to omit',
    );
  }

  if (isWhitespaceOnly(ariaLabelledBy)) {
    throw new Error('SegmentedControl: ariaLabelledBy must not be whitespace-only');
  }
  if (isWhitespaceOnly(ariaLabel)) {
    throw new Error('SegmentedControl: ariaLabel must not be whitespace-only');
  }

  const hasAriaLabelledBy = typeof ariaLabelledBy === 'string' && ariaLabelledBy.length > 0;
  const hasAriaLabel = typeof ariaLabel === 'string' && ariaLabel.length > 0;

  if (hasAriaLabelledBy && hasAriaLabel) {
    throw new Error('SegmentedControl: supply either ariaLabelledBy or ariaLabel, not both');
  }

  if (!hasAriaLabelledBy && !hasAriaLabel) {
    throw new Error('SegmentedControl: exactly one of ariaLabelledBy or ariaLabel is required');
  }
}
