/**
 * Client success stories data.
 * Used by SuccessStories.astro (homepage slider) and /success-stories overview page.
 */

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

/** Single success story */
export type SuccessStory = {
  /** Unique identifier */
  id: string;
  /** URL slug for detail page */
  slug: string;
  /** Client name */
  name: string;
  /** Before transformation image URL */
  beforeImage: string;
  /** After transformation image URL */
  afterImage: string;
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
  /** Full story text for detail page */
  fullStory: string;
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

// TODO: Replace placeholder images before go-live
const successStories = [
  {
    id: 'sarah-m',
    slug: 'sarah-m',
    name: 'Sarah M.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Lost 30lbs in 6 months',
    program: 'lifestyle',
    coach: 'gina',
    quote:
      'Working with Gina changed my entire relationship with food and fitness. For the first time, I feel strong and confident.',
    duration: '6 months',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
  },
  {
    id: 'jessica-k',
    slug: 'jessica-k',
    name: 'Jessica K.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'First Bikini Competition Win',
    program: 'competition-prep',
    coach: 'helle',
    quote:
      "Helle's competition prep was on another level. She knew exactly how to peak my physique for stage day.",
    duration: '16 weeks',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
  },
  {
    id: 'amanda-r',
    slug: 'amanda-r',
    name: 'Amanda R.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Gained 12lbs lean muscle',
    program: 'muscle-building',
    coach: 'irene',
    quote:
      'Irene taught me that building muscle after 40 is not only possible — it can be the best shape of your life.',
    duration: '12 months',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
  },
  {
    id: 'maria-l',
    slug: 'maria-l',
    name: 'Maria L.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Figure Competition Top 3',
    program: 'competition-prep',
    coach: 'helle',
    quote:
      'The team approach meant I had three champions in my corner. That made all the difference on stage.',
    duration: '20 weeks',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
  },
  {
    id: 'rachel-w',
    slug: 'rachel-w',
    name: 'Rachel W.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Complete lifestyle overhaul',
    program: 'lifestyle',
    coach: 'gina',
    quote:
      "I didn't just lose weight — I gained a whole new lifestyle. Gina's holistic approach changed everything.",
    duration: '9 months',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
  },
  {
    id: 'dana-t',
    slug: 'dana-t',
    name: 'Dana T.',
    beforeImage: 'https://placehold.co/400x500/9ca3af/ffffff?text=Before',
    afterImage: 'https://placehold.co/400x500/4a9199/ffffff?text=After',
    transformation: 'Added 8lbs muscle, dropped 15lbs fat',
    program: 'muscle-building',
    coach: 'irene',
    quote:
      'At 52, I feel stronger than I did at 30. Irene understands how to train a body that has lived a full life.',
    duration: '10 months',
    fullStory:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.',
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

/**
 * Get stories filtered by program type.
 */
function getStoriesByProgram(program: ProgramType): readonly SuccessStory[] {
  return successStories.filter((story) => story.program === program);
}

/**
 * Get a story by its slug.
 */
function getStoryBySlug(slug: string): SuccessStory | undefined {
  return successStories.find((story) => story.slug === slug);
}

export { getStoriesByProgram, getStoryBySlug, successStories, successStoriesSection };
