/**
 * Section background variant classes.
 * Used by components that accept a `background: 'default' | 'muted'` prop
 * to alternate between standard and muted section backgrounds.
 *
 * @example
 * ```astro
 * import { sectionBackground, type SectionBackground } from '~/utils/styles';
 * type Props = { background?: SectionBackground };
 * const { background = 'default' } = Astro.props;
 * ---
 * <section class:list={['px-6 py-24', sectionBackground[background]]}>
 * ```
 */

export type SectionBackground = 'default' | 'muted';

export const sectionBackground: Record<SectionBackground, string> = {
  default: 'bg-background dark:bg-background-dark',
  muted: 'bg-background-muted dark:bg-background-dark-muted',
};
