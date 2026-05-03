/**
 * Extract the first whitespace-delimited token from a name string.
 *
 * Returns the first token after trimming leading/trailing whitespace and
 * splitting on any internal whitespace run. Returns `null` when the input
 * is empty or whitespace-only, so call-sites can branch to a non-personalised
 * template rather than substitute an awkward sentinel string.
 *
 * The helper is domain-free: it makes no assumptions about success stories,
 * coaches, or any other entity. Given any human-name string, it returns the
 * leading token. Hyphenated first names stay intact (no token split inside
 * the hyphen).
 *
 * @example
 * ```ts
 * getFirstName('Sarah M.')        // 'Sarah'
 * getFirstName('Helle')           // 'Helle'
 * getFirstName('Mary-Anne K.')    // 'Mary-Anne'
 * getFirstName('   Sarah M.   ') // 'Sarah'
 * getFirstName('   ')             // null
 * getFirstName('')                // null
 * ```
 */
function getFirstName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  const [firstToken] = trimmed.split(/\s+/, 1);
  return firstToken && firstToken.length > 0 ? firstToken : null;
}

export { getFirstName };
