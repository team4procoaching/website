/**
 * Generate a URL-safe slug from a string.
 * Useful for generating IDs for aria-labelledby, anchor links, etc.
 *
 * @example
 * ```ts
 * slugify('Hello World!') // 'hello-world'
 * slugify('  Multiple   Spaces  ') // 'multiple-spaces'
 * slugify('Ümlauts & Spëcial') // 'mlauts-spcial'
 * ```
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
