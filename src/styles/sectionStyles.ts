/**
 * Section background variant classes.
 * Used by components that accept a `background` prop to alternate between
 * standard, muted, and darker section backgrounds for visual rhythm.
 *
 * The dark variants (teal, silver, sage, charcoal) are light-mode only.
 * In dark mode they fall back to background-dark(-muted).
 *
 * @see {@link docs/reference/color-system.md} for full specification
 * @see {@link docs/adr/0014-light-mode-section-background-system.md} for decision
 *
 * @example
 * ```astro
 * import { sectionBackground, sectionText, type SectionBackground } from '~/styles/sectionStyles';
 * type Props = { background?: SectionBackground };
 * const { background = 'default' } = Astro.props;
 * ---
 * <section class:list={['px-6 py-24', sectionBackground[background]]}>
 *   <h2 class:list={[sectionText[background], 'text-4xl font-bold']}>...</h2>
 * ```
 */

type SectionBackground = 'default' | 'muted' | 'teal' | 'silver' | 'sage' | 'charcoal';

/** Background color classes per variant. */
const sectionBackground: Record<SectionBackground, string> = {
  default: 'bg-background dark:bg-background-dark',
  muted: 'bg-background-muted dark:bg-background-dark-muted',
  teal: 'bg-surface-teal dark:bg-background-dark',
  silver: 'bg-surface-silver dark:bg-background-dark',
  sage: 'bg-surface-sage dark:bg-background-dark-muted',
  charcoal: 'bg-surface-charcoal dark:bg-background-dark',
};

/**
 * Whether a background variant is "dark" (needs light/white text).
 * Useful for conditional card styling and text color logic in components.
 */
const isDarkBackground = (bg: SectionBackground): boolean =>
  bg === 'teal' || bg === 'silver' || bg === 'sage' || bg === 'charcoal';

/** Headline text color classes per variant. */
const sectionHeadline: Record<SectionBackground, string> = {
  default: 'text-foreground-950 dark:text-white',
  muted: 'text-foreground-950 dark:text-white',
  teal: 'text-white',
  silver: 'text-white',
  sage: 'text-white',
  charcoal: 'text-white',
};

/** Body/description text color classes per variant. */
const sectionText: Record<SectionBackground, string> = {
  default: 'text-foreground-700 dark:text-gray-400',
  muted: 'text-foreground-700 dark:text-gray-400',
  teal: 'text-white/90',
  silver: 'text-white/90',
  sage: 'text-white/90',
  charcoal: 'text-white/90',
};

// Export
export { sectionBackground, isDarkBackground, sectionHeadline, sectionText };
export type { SectionBackground };
