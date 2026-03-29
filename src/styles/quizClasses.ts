/**
 * Shared Tailwind class strings for quiz radio-card options.
 *
 * Used by:
 * - QuizStepPanel.astro (server-rendered steps 1, 3, 4)
 * - quizModalController.ts (dynamically generated step 2 options)
 *
 * Single source of truth — eliminates the sync risk between server-rendered
 * and client-rendered option cards.
 */

/** Radio-card label wrapper: border, hover, checked ring */
export const quizOptionClasses =
  'group relative block cursor-pointer rounded-lg border border-foreground-200 bg-white px-5 py-4 transition-all hover:border-foreground-300 has-checked:border-accent-600 has-checked:ring-2 has-checked:ring-accent-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:has-checked:border-accent-500 dark:has-checked:ring-accent-500';
