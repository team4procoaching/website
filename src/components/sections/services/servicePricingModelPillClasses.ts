/**
 * Tailwind class list for the session-based service pill (ADR-0047).
 *
 * Extracted into a sibling `.ts` file — mirroring
 * `successStoryServiceBadgeClasses.ts` — so the pill's visual identity has a
 * single grep-visible home and the `.astro` frontmatter stays free of an
 * `export const` (no precedent for that in this repo; sibling-`.ts` extraction
 * matches the `processStepText.ts` / `successStoryServiceBadgeClasses.ts`
 * pattern).
 *
 * The palette is deliberately quiet: a neutral muted grey on both light and
 * dark surfaces, intentionally less prominent than the teal
 * `SuccessStoryServiceBadge` and quieter than the card's h3 title. Per
 * ADR-0047 the pill describes the pricing model, it does not market the
 * service — louder styling would promote it into a marketing element, which
 * the ADR explicitly guards against.
 */

const SERVICE_PRICING_MODEL_PILL_CLASS =
  'inline-flex w-fit items-center rounded-md bg-foreground-100 px-1.5 py-0.5 text-xs font-medium text-foreground-700 inset-ring inset-ring-foreground-300/40 dark:bg-foreground-900/30 dark:text-foreground-300 dark:inset-ring-foreground-300/30';

export { SERVICE_PRICING_MODEL_PILL_CLASS };
