/**
 * Success stories types, configuration, and display helpers.
 *
 * ARCHITECTURE NOTE — Division of Responsibilities:
 *
 * This file owns:
 * - Shared types (ProgramType, CoachId, SuccessStory)
 * - Display labels (programLabels)
 * - Homepage section config (successStoriesSection)
 * - Helper to map Content Collection entries to component-friendly shape
 *
 * The Content Collection (src/content/success-stories/*.mdx) owns:
 * - Individual story data (frontmatter) and full story text (MDX body)
 * - Zod schema validation (src/content.config.ts)
 *
 * Components consume SuccessStory objects via props — they don't need to know
 * whether data comes from a static array or a Content Collection.
 * Pages are responsible for fetching from the Collection and mapping entries
 * using toSuccessStory().
 */

import type { CollectionEntry } from 'astro:content';

/** Supported coaching program types */
export type ProgramType = 'competition-prep' | 'lifestyle' | 'muscle-building';

/** Coach identifier — matches coach IDs in coaches.ts */
export type CoachId = 'helle' | 'gina' | 'irene';

/** Display labels for program types */
export const programLabels: Record<ProgramType, string> = {
  'competition-prep': 'Competition Prep',
  lifestyle: 'Lifestyle Transformation',
  'muscle-building': 'Muscle Building',
};

/**
 * Success story shape consumed by components (cards, grids, detail pages).
 * Derived from Content Collection entries via toSuccessStory().
 */
export type SuccessStory = {
  /** Unique identifier (matches MDX filename without extension) */
  id: string;
  /** URL slug for detail page (same as id) */
  slug: string;
  /** Client name */
  name: string;
  /** Before transformation image URL */
  beforeImage: string;
  /** After transformation image URL */
  afterImage: string;
  /** Portrait image URL (optional, for detail page header) */
  portrait?: string;
  /** Transformation summary, e.g. "Lost 30lbs in 6 months" */
  transformation: string;
  /** Coaching program type */
  program: ProgramType;
  /** Assigned coach */
  coach: CoachId;
  /** Client quote (short teaser for cards) */
  quote: string;
  /** Transformation duration, e.g. "6 months" */
  duration: string;
};

/** Success stories section configuration (homepage) */
export type SuccessStoriesSection = {
  /** Section headline */
  headline: string;
  /** Section intro text */
  intro: string;
  /** Link to all success stories */
  allStoriesLink: {
    label: string;
    href: string;
  };
};

/** Homepage section config — headline, intro, and link to overview page */
export const successStoriesSection = {
  headline: "Our Clients' Success Stories",
  intro: 'Real transformations from <strong>real women</strong> who trusted us with their journey.',
  allStoriesLink: {
    label: 'See all success stories',
    href: '/success-stories',
  },
} as const satisfies SuccessStoriesSection;

/**
 * Map a Content Collection entry to the SuccessStory shape consumed by components.
 * Pages call this after getCollection('success-stories') to bridge the gap
 * between Astro's collection API and component props.
 */
export function toSuccessStory(entry: CollectionEntry<'success-stories'>): SuccessStory {
  return {
    id: entry.id,
    slug: entry.id,
    ...entry.data,
  };
}
