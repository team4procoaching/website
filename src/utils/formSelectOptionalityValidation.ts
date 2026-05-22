/**
 * Validate the FormSelect optionality XOR contract: at most one of
 * `optional` or `required` may be set. Both unset is legal — it expresses
 * "no chrome hint and no HTML5 required attribute" (e.g., a select inside
 * a `<fieldset required>` that inherits required-ness from the group, or
 * a select whose surrounding form-step component renders the chrome
 * hint). Both set is rejected with a message that names both prop names
 * so failing tests and consumer stack traces point directly at the fix.
 *
 * `false` is distinct from `undefined` and not a violation: passing
 * `optional={false}` explicitly is a legal "no chrome hint" expression
 * and never collides with `required`.
 *
 * Mirrors the XOR-validation helper pattern in
 * `src/utils/labellingValidation.ts` — extracted to a pure helper so
 * the invariant can be regression-tested without spinning up an Astro
 * component render environment. FormSelect itself calls this at the top
 * of its template frontmatter before rendering.
 */
export function validateFormSelectOptionality(args: {
  optional: boolean | undefined;
  required: boolean | undefined;
}): void {
  if (args.optional && args.required) {
    throw new Error('FormSelect: supply either `optional` or `required`, not both');
  }
}
