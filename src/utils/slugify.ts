/**
 * Generate a URL-safe slug from a string.
 * Useful for generating IDs for aria-labelledby, anchor links, etc.
 *
 * Two-phase transliteration:
 * 1. Manual substitution for characters that NFD cannot decompose
 *    (e.g. ø, ß, æ — these are atomic code points, not base + combining mark).
 * 2. NFD normalization to split composed characters (e.g. ü → u + ̈),
 *    then strip the combining diacritics.
 *
 * Throws at build time if the input produces an empty slug, since empty IDs
 * are invalid HTML and break aria-labelledby references.
 *
 * Known limitation: only produces ASCII slugs. Non-Latin scripts (CJK,
 * Cyrillic, Arabic, etc.) are stripped entirely and will produce empty slugs.
 *
 * @example
 * ```ts
 * slugify('Hello World!') // 'hello-world'
 * slugify('  Multiple   Spaces  ') // 'multiple-spaces'
 * slugify('Ümlauts & Spëcial') // 'umlauts-special'
 * slugify('Sønderborg') // 'soenderborg'
 * slugify('café résumé') // 'cafe-resume'
 * slugify('Straße') // 'strasse'
 * ```
 *
 * @throws {Error} If the input produces an empty slug
 */

/**
 * Manual substitution map for Unicode characters that NFD does NOT decompose.
 * Only includes characters relevant to coach bios, European place names,
 * and common loanwords. Extend as needed.
 */
const CHAR_MAP: Record<string, string> = {
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ø: 'oe',
  Ø: 'OE',
  ß: 'ss',
  ð: 'd',
  Ð: 'D',
  þ: 'th',
  Þ: 'Th',
  đ: 'd',
  Đ: 'D',
  ł: 'l',
  Ł: 'L',
};

/**
 * Regex matching all keys in CHAR_MAP.
 * Constraint: CHAR_MAP keys must not contain regex-special characters
 * inside a character class (`]`, `-`, `\`, `^` at position 0).
 * All current keys are single Unicode letters, which are safe.
 */
const CHAR_MAP_REGEX = new RegExp(`[${Object.keys(CHAR_MAP).join('')}]`, 'g');

function slugify(text: string): string {
  const slug = text
    .replace(CHAR_MAP_REGEX, (ch) => CHAR_MAP[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error(`slugify: input "${text}" produced an empty slug`);
  }

  return slug;
}

// Export
export { slugify };
