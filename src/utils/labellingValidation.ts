const isWhitespaceOnly = (v: string | undefined): boolean =>
  typeof v === 'string' && v.length > 0 && v.trim().length === 0;

/**
 * Discriminated-union prop contract for the labelling XOR: exactly one of
 * `ariaLabelledBy` (reference a visible label) or `ariaLabel` (invisible
 * accessible name) may be set. The `?: never` flag on the alternative arm
 * turns "both at once" into a TypeScript error at call-site, complementing
 * the runtime check in `validateLabellingXor`.
 *
 * Shared by every primitive that carries the labelling XOR invariant
 * (`FilterBar`, `SegmentedControl`); each spreads it into its own `Props`.
 */
export type LabellingProps =
  | { ariaLabelledBy: string; ariaLabel?: never }
  | { ariaLabel: string; ariaLabelledBy?: never };

/**
 * Validate the labelling XOR contract: exactly one of `ariaLabelledBy` or
 * `ariaLabel` must be present and non-empty. Empty strings and
 * whitespace-only strings are rejected outright — they would pass a naive
 * truthiness check but produce an empty Accessible Name, and the template
 * binds the raw prop value to the DOM, so the single-source-of-labelling
 * invariant would be silently violated.
 *
 * Returns nothing on success; throws with a message that names the calling
 * component, the specific prop, and the specific violation (invalid value,
 * whitespace-only, both provided, neither provided) so failing tests and
 * consumer stack traces point directly at the fix. The `componentName`
 * argument keeps each thrown message per-component-precise (`FilterBar: …`,
 * `SegmentedControl: …`) from one shared implementation.
 *
 * Extracted to a pure helper so the invariant can be regression-tested
 * without spinning up an Astro component render environment. Shared by the
 * `<fieldset>` / `role="toolbar"` primitive family (`FilterBar`,
 * `SegmentedControl`); each calls this at the top of its template
 * frontmatter before rendering, passing its own component name.
 *
 * @param componentName Name of the calling component, used as the error
 *   message prefix (e.g. `'FilterBar'`).
 * @param ariaLabelledBy The component's `ariaLabelledBy` prop value.
 * @param ariaLabel The component's `ariaLabel` prop value.
 */
export function validateLabellingXor(
  componentName: string,
  ariaLabelledBy: string | undefined,
  ariaLabel: string | undefined,
): void {
  if (ariaLabelledBy === '') {
    throw new Error(
      `${componentName}: ariaLabelledBy has invalid value (empty string); pass undefined to omit`,
    );
  }
  if (ariaLabel === '') {
    throw new Error(
      `${componentName}: ariaLabel has invalid value (empty string); pass undefined to omit`,
    );
  }

  if (isWhitespaceOnly(ariaLabelledBy)) {
    throw new Error(`${componentName}: ariaLabelledBy must not be whitespace-only`);
  }
  if (isWhitespaceOnly(ariaLabel)) {
    throw new Error(`${componentName}: ariaLabel must not be whitespace-only`);
  }

  const hasAriaLabelledBy = typeof ariaLabelledBy === 'string' && ariaLabelledBy.length > 0;
  const hasAriaLabel = typeof ariaLabel === 'string' && ariaLabel.length > 0;

  if (hasAriaLabelledBy && hasAriaLabel) {
    throw new Error(`${componentName}: supply either ariaLabelledBy or ariaLabel, not both`);
  }

  if (!hasAriaLabelledBy && !hasAriaLabel) {
    throw new Error(`${componentName}: exactly one of ariaLabelledBy or ariaLabel is required`);
  }
}
