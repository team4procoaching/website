/**
 * Unique Selling Points (USPs) data.
 * Used by Usps.astro section to highlight what makes Team 4 Pro unique.
 */

/** Single USP/advantage item */
type Usp = {
  /** Unique identifier */
  id: string;
  /** USP headline */
  title: string;
  /**
   * USP description - supports HTML for bold text.
   * SECURITY: Must be trusted HTML only - rendered via set:html.
   */
  description: string;
  /**
   * SVG icon inner markup (path elements for viewBox "0 0 24 24").
   * SECURITY: Must be trusted HTML only - rendered via set:html.
   */
  icon: string;
};

/** USPs section configuration */
type UspsSection = {
  /** Section headline */
  headline: string;
  /** Section intro text */
  intro: string;
};

// Heroicons Solid: beaker
const beakerIcon =
  '<path fill-rule="evenodd" d="M10.5 3.798v5.02a3 3 0 0 1-.879 2.121l-2.377 2.377a9.845 9.845 0 0 1 5.091 1.013 8.315 8.315 0 0 0 5.713.636l.285-.071-3.954-3.955a3 3 0 0 1-.879-2.121v-5.02a23.614 23.614 0 0 0-3 0Zm4.5.138a.75.75 0 0 0 .093-1.495A24.837 24.837 0 0 0 12 2.25a25.048 25.048 0 0 0-3.093.191A.75.75 0 0 0 9 3.936v4.882a1.5 1.5 0 0 1-.44 1.06l-6.293 6.294c-1.62 1.621-.903 4.475 1.471 4.88 2.686.46 5.447.698 8.262.698 2.816 0 5.576-.239 8.262-.697 2.373-.406 3.092-3.26 1.47-4.881L15.44 9.879A1.5 1.5 0 0 1 15 8.818V3.936Z" clip-rule="evenodd" />';

// Heroicons Solid: user-group
const userGroupIcon =
  '<path d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" /><path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />';

// Heroicons Solid: check
const checkIcon =
  '<path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />';

const usps = [
  {
    id: 'female-science',
    title: 'Female-Specific Science',
    description:
      'We understand <strong>hormonal cycles</strong>, female muscle building patterns, and <strong>competition prep challenges</strong> that only women face. Our approach accounts for your unique physiology.',
    icon: beakerIcon,
  },
  {
    id: 'collective-wisdom',
    title: 'Collective Champion Wisdom',
    description:
      "While you work with one primary coach, you benefit from our <strong>entire Pro team's experience</strong>. Three champion minds working on your success - whether competing or transforming.",
    icon: userGroupIcon,
  },
  {
    id: 'results-driven',
    title: 'Results-Driven Approach',
    description:
      'We deliver <strong>measurable physique changes</strong>, strength gains, competition victories, and lifestyle transformations. No fluff - just proven methods that work.',
    icon: checkIcon,
  },
] as const satisfies readonly Usp[];

const uspsSection = {
  headline: 'What Makes Team 4 Pro Unique',
  intro:
    'Elite female coaching expertise that serves both <strong>competitive athletes</strong> and <strong>lifestyle transformations</strong> with unmatched understanding.',
} as const satisfies UspsSection;

// Export
export { usps, uspsSection };
export type { Usp, UspsSection };
