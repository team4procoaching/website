/**
 * Tailwind class list for the success-story service-discovery pill.
 *
 * Extracted from `SuccessStoryServiceBadge.astro` so the same visual
 * shape can be reused by the read-more modal's runtime-populated
 * service link, without duplicating the class string. Both surfaces
 * route to the same destination (detail page when complete, else
 * contact prefill); the visual identity is the second half of that
 * promise — sighted readers recognise the pill as the same affordance
 * across the homepage card and the modal.
 *
 * Kept in a sibling `.ts` file (rather than a frontmatter `export const`)
 * because Astro frontmatter has no precedent in this repo for exporting
 * runtime values. Sibling-`.ts` extraction matches the
 * `processStepText.ts` pattern.
 */

const SUCCESS_STORY_SERVICE_BADGE_CLASS =
  'inline-flex w-fit items-center gap-x-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700 inset-ring inset-ring-teal-600/20 hover:bg-teal-100 hover:text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-teal-900/30 dark:text-teal-300 dark:inset-ring-teal-300/30';

export { SUCCESS_STORY_SERVICE_BADGE_CLASS };
