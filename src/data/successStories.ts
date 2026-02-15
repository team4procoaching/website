/**
 * Client success stories data.
 * Used by SuccessStories.astro section.
 */

/** Single success story */
export type SuccessStory = {
  /** Unique identifier */
  id: string;
  /** Client name */
  name: string;
  /** Before transformation image URL */
  beforeImage: string;
  /** After transformation image URL */
  afterImage: string;
  /**
   * Transformation summary, e.g. "Lost 30lbs in 6 months"
   */
  transformation: string;
  /**
   * Program type (optional), e.g. "Lifestyle Transformation"
   */
  program?: string;
};

/** Success stories section configuration */
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

// TODO: Replace placeholder images before go-live
const successStories = [
  {
    id: 'sarah-m',
    name: 'Sarah M.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Lost 30lbs in 6 months',
    program: 'Lifestyle Transformation',
  },
  {
    id: 'jessica-k',
    name: 'Jessica K.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'First Bikini Competition Win',
    program: 'Competition Prep',
  },
  {
    id: 'amanda-r',
    name: 'Amanda R.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Gained 12lbs lean muscle',
    program: 'Muscle Building',
  },
] as const satisfies readonly SuccessStory[];

const successStoriesSection = {
  headline: "Our Clients' Success Stories",
  intro: 'Real transformations from <strong>real women</strong> who trusted us with their journey.',
  allStoriesLink: {
    label: 'See all success stories',
    href: '/success-stories',
  },
} as const satisfies SuccessStoriesSection;

export { successStories, successStoriesSection };
