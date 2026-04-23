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

// Custom DNA double helix — not a Heroicons icon (Heroicons v2 has no DNA).
// Stroke-based because a true filled ribbon would require perpendicular curve
// offsetting that is hard to author by hand at the 24x24 viewBox. Fill is set
// to "none" on the group since the parent <svg> sets fill="currentColor";
// stroke="currentColor" picks up the icon color from the same source.
//
// Layout: two S-curve strands crossing twice (y=6.5 and y=17.5), rotated 45°
// for a diagonal composition. Rungs float centered between the strands
// without touching either outer edge — they are shorter than the strand gap
// at each y, evoking the stylised DNA look where base pairs sit inside each
// helix "lens". Rungs use a thinner stroke for visual hierarchy.
const dnaIcon =
  '<g transform="rotate(45 12 12)" stroke="currentColor" stroke-linecap="round" fill="none">' +
  '<g stroke-width="1.25">' +
  '<path d="M8 1C8 6.5 16 6.5 16 12C16 17.5 8 17.5 8 23" />' +
  '<path d="M16 1C16 6.5 8 6.5 8 12C8 17.5 16 17.5 16 23" />' +
  '</g>' +
  '<g stroke-width="1">' +
  '<path d="M10.5 3L13.5 3" />' +
  '<path d="M11 5L13 5" />' +
  '<path d="M10.5 9L13.5 9" />' +
  '<path d="M9.75 12L14.25 12" />' +
  '<path d="M10.5 15L13.5 15" />' +
  '<path d="M11 19L13 19" />' +
  '<path d="M10.5 21L13.5 21" />' +
  '</g>' +
  '</g>';

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
    icon: dnaIcon,
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
