/**
 * Client testimonial quotes.
 * Used by TestimonialGrid.astro (masonry layout on /success-stories).
 * Separate from SuccessStory quotes — these are shorter text-only testimonials
 * that provide "volume" social proof without requiring before/after imagery.
 */

/** Single testimonial quote */
export type Testimonial = {
  /** Unique identifier */
  id: string;
  /** Client name */
  name: string;
  /** Quote text */
  quote: string;
  /** Avatar image URL */
  avatar: string;
  /** Client title or category, e.g. "Figure Competitor" */
  title: string;
  /** Whether this testimonial is visually featured (larger card in masonry) */
  featured?: boolean;
};

// TODO: Replace placeholder avatars before go-live
const testimonials = [
  {
    id: 'tina-r',
    name: 'Tina R.',
    quote:
      'I came to Team 4 Pro feeling lost after years of yo-yo dieting. Within weeks, I had a plan that actually made sense — and for the first time, I stuck with it. These women understand what it takes because they have lived it.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=TR',
    title: 'Lifestyle Client',
    featured: true,
  },
  {
    id: 'laura-b',
    name: 'Laura B.',
    quote:
      'The level of detail in my competition prep was unlike anything I had experienced before. Every adjustment was precise and purposeful.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=LB',
    title: 'Bikini Competitor',
  },
  {
    id: 'hannah-m',
    name: 'Hannah M.',
    quote:
      'Having three coaches collaborate on my program gave me perspectives I never would have gotten from a single coach.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=HM',
    title: 'Figure Competitor',
  },
  {
    id: 'sophia-d',
    name: 'Sophia D.',
    quote:
      'I was nervous about starting at 45. Irene immediately put me at ease — she has been competing at the highest level in her fifties and proves every day that age is not a limitation.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=SD',
    title: 'Masters Athlete',
  },
  {
    id: 'nicole-k',
    name: 'Nicole K.',
    quote:
      'Gina helped me see that transformation is not just physical. The mental shifts were the real game-changer.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=NK',
    title: 'Lifestyle Client',
  },
  {
    id: 'angela-s',
    name: 'Angela S.',
    quote:
      'From check-ins to posing practice, every touchpoint felt intentional. This team genuinely cares about your success.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=AS',
    title: 'Bikini Competitor',
  },
  {
    id: 'christine-w',
    name: 'Christine W.',
    quote:
      "I've worked with other coaches before, but no one has ever understood the female athlete experience the way this team does.",
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=CW',
    title: 'Figure Competitor',
  },
  {
    id: 'patricia-h',
    name: 'Patricia H.',
    quote:
      'My husband noticed the change before I did. Not just my body — my energy, my confidence, everything. Thank you, Team 4 Pro.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=PH',
    title: 'Lifestyle Client',
  },
  {
    id: 'karen-j',
    name: 'Karen J.',
    quote:
      "Helle's peak week protocol was flawless. I stepped on stage feeling the most confident I have ever felt.",
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=KJ',
    title: 'Physique Competitor',
  },
] as const satisfies readonly Testimonial[];

export { testimonials };
