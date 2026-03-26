/**
 * Check if a URL points to an external site.
 * Used for conditionally adding `target="_blank"` and `rel="noopener noreferrer"`.
 *
 * Covers `http://` and `https://` protocols. Intentionally does not flag
 * `mailto:`, `tel:`, or other non-http protocols as external — these open
 * native handlers, not new browser tabs.
 *
 * @example
 * ```ts
 * isExternal('https://instagram.com/team4pro') // true
 * isExternal('/contact') // false
 * isExternal('mailto:hello@team4pro.com') // false
 * ```
 */
function isExternal(href: string): boolean {
  const normalized = href.trim().toLowerCase();
  return normalized.startsWith('https://') || normalized.startsWith('http://');
}

// Export
export { isExternal };
