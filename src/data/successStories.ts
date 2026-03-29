/**
 * Success stories data, types, and display helpers.
 *
 * ARCHITECTURE NOTE — Division of Responsibilities:
 *
 * This file owns:
 * - Story data (inline, sorted by name)
 * - Shared types (ProgramId, SuccessStory) and imported CoachId from coaches.ts
 * - Display labels (programLabels)
 * - Homepage section config (successStoriesSection)
 *
 * Components consume SuccessStory objects via props — consistent with other
 * domain data modules (coaches, testimonials, stats, USPs).
 */

import type { CoachId } from '~/data/coaches';
import { routes } from '~/data/routes';
import type { ImageSource } from '~/types/components';
import { remoteImage } from '~/types/components';

/**
 * Program type identifiers — single source of truth.
 * Used to derive the ProgramId type.
 * Add new programs here; TypeScript will flag every location that needs updating.
 */
const programIds = ['competition-prep', 'lifestyle', 'muscle-building'] as const;

/** Coaching program type, derived from {@link programIds}. */
type ProgramId = (typeof programIds)[number];

/** Display labels for program types */
const programLabels: Record<ProgramId, string> = {
  'competition-prep': 'Competition Prep',
  lifestyle: 'Lifestyle Transformation',
  'muscle-building': 'Muscle Building',
};

/**
 * Success story shape consumed by components (cards, grids).
 */
type SuccessStory = {
  /** Client name */
  name: string;
  /** Before transformation image */
  beforeImage: ImageSource;
  /** After transformation image */
  afterImage: ImageSource;
  /** Transformation summary, e.g. "Lost 30lbs in 6 months" */
  transformation: string;
  /** Coaching program type */
  program: ProgramId;
  /** Assigned coach */
  coach: CoachId;
  /** Client quote (short teaser for cards) */
  quote: string;
  /** Transformation duration, e.g. "6 months" */
  duration: string;
};

/** Success stories section configuration (homepage) */
type SuccessStoriesSection = {
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

/** All success stories, sorted by name */
const successStories: readonly SuccessStory[] = [
  {
    name: 'Amanda R.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'Gained 12lbs lean muscle',
    program: 'muscle-building',
    coach: 'irene',
    quote:
      'Irene taught me that building muscle after 40 is not only possible — it can be the best shape of your life.',
    duration: '12 months',
  },
  {
    name: 'Dana T.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'Added 8lbs muscle, dropped 15lbs fat',
    program: 'muscle-building',
    coach: 'irene',
    quote:
      'At 52, I feel stronger than I did at 30. Irene understands how to train a body that has lived a full life.',
    duration: '10 months',
  },
  {
    name: 'Jessica K.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'First Bikini Competition Win',
    program: 'competition-prep',
    coach: 'helle',
    quote:
      "Helle's competition prep was on another level. She knew exactly how to peak my physique for stage day.",
    duration: '16 weeks',
  },
  {
    name: 'Maria L.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'Figure Competition Top 3',
    program: 'competition-prep',
    coach: 'helle',
    quote:
      'The team approach meant I had three champions in my corner. That made all the difference on stage.',
    duration: '20 weeks',
  },
  {
    name: 'Rachel W.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'Complete lifestyle overhaul',
    program: 'lifestyle',
    coach: 'gina',
    quote:
      "I didn't just lose weight — I gained a whole new lifestyle. Gina's holistic approach changed everything.",
    duration: '9 months',
  },
  {
    name: 'Sarah M.',
    beforeImage: remoteImage('https://placehold.co/800x1000/9ca3af/ffffff?text=Before', 800, 1000),
    afterImage: remoteImage('https://placehold.co/800x1000/4a9199/ffffff?text=After', 800, 1000),
    transformation: 'Lost 30lbs in 6 months',
    program: 'lifestyle',
    coach: 'gina',
    quote:
      'Working with Gina changed my entire relationship with food and fitness. For the first time, I feel strong and confident.',
    duration: '6 months',
  },
];

/** Homepage section config — headline, intro, and link to overview page */
const successStoriesSection = {
  headline: "Our Clients' Success Stories",
  intro: 'Real transformations from <strong>real women</strong> who trusted us with their journey.',
  allStoriesLink: {
    label: 'See all success stories',
    href: routes.successStories,
  },
} as const satisfies SuccessStoriesSection;

// Export
export { programIds, programLabels, successStories, successStoriesSection };
export type { ProgramId, SuccessStory, SuccessStoriesSection };
