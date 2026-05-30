/**
 * Client testimonial quotes.
 *
 * @see ~/components/sections/successStories/TestimonialGrid.astro
 * @see ~/components/sections/successStories/TestimonialCard.astro
 * @see ~/pages/success-stories/index.astro
 *
 * Separate from SuccessStory quotes — these are shorter text-only testimonials
 * that provide "volume" social proof without requiring before/after imagery.
 *
 * DATA FORMAT DECISION (ADR-0011):
 * Testimonials are a small, stable dataset (< 20 entries) with flat structure,
 * no body text, and no individual detail pages. TypeScript is the correct format.
 * See docs/adr/0011-content-format-decision-framework.md for the full rationale.
 *
 * DATA INTEGRITY (ADR-0017):
 * Identifiers are the single source of truth via {@link testimonialIds}, the
 * derived {@link TestimonialId} type, and the {@link testimonialsById} record
 * whose `as const satisfies Record<TestimonialId, Testimonial>` guarantees
 * compile-time completeness. `Service.testimonialIds` cross-references this
 * union, so adding or removing an identifier flags every consumer.
 */

/**
 * Testimonial identifiers — single source of truth.
 * Used to derive the TestimonialId type and to drive the
 * `testimonialsById` record's compile-time completeness check (ADR-0017).
 * Add new testimonials here; TypeScript will flag every location that
 * needs updating, including `Service.testimonialIds` literals.
 */
const testimonialIds = [
  'tina-r',
  'laura-b',
  'hannah-m',
  'sophia-d',
  'nicole-k',
  'angela-s',
  'christine-w',
  'patricia-h',
  'karen-j',
] as const;

/** Testimonial identifier type, derived from {@link testimonialIds}. */
type TestimonialId = (typeof testimonialIds)[number];

/** Single testimonial quote */
type Testimonial = {
  /** Unique identifier — must be a value from {@link testimonialIds} */
  id: TestimonialId;
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

/**
 * Testimonials keyed by ID — compile-time completeness guarantee.
 *
 * `Record<TestimonialId, Testimonial>` ensures that every value in
 * {@link testimonialIds} has a corresponding data entry. Adding a new ID to
 * `testimonialIds` without adding a record here is a compile error, and
 * `Service.testimonialIds` literals are type-checked against the same union.
 */
// TODO: Replace placeholder avatars before go-live
const testimonialsById = {
  'tina-r': {
    id: 'tina-r',
    name: 'Tina R.',
    quote:
      'I came to Team 4 Pro feeling lost after years of yo-yo dieting. Within weeks, I had a plan that actually made sense — and for the first time, I stuck with it. These women understand what it takes because they have lived it.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=TR',
    title: 'Lifestyle Client',
    featured: true,
  },
  'laura-b': {
    id: 'laura-b',
    name: 'Laura B.',
    quote:
      'The level of detail in my competition prep was unlike anything I had experienced before. Every adjustment was precise and purposeful.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=LB',
    title: 'Bikini Competitor',
  },
  'hannah-m': {
    id: 'hannah-m',
    name: 'Hannah M.',
    quote:
      'Having three coaches collaborate on my program gave me perspectives I never would have gotten from a single coach.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=HM',
    title: 'Figure Competitor',
  },
  'sophia-d': {
    id: 'sophia-d',
    name: 'Sophia D.',
    quote:
      'I was nervous about starting at 45. Irene immediately put me at ease — she has been competing at the highest level in her fifties and proves every day that age is not a limitation.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=SD',
    title: 'Masters Athlete',
  },
  'nicole-k': {
    id: 'nicole-k',
    name: 'Nicole K.',
    quote:
      'Gina helped me see that transformation is not just physical. The mental shifts were the real game-changer.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=NK',
    title: 'Lifestyle Client',
  },
  'angela-s': {
    id: 'angela-s',
    name: 'Angela S.',
    quote:
      'From check-ins to posing practice, every touchpoint felt intentional. This team genuinely cares about your success.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=AS',
    title: 'Bikini Competitor',
  },
  'christine-w': {
    id: 'christine-w',
    name: 'Christine W.',
    quote:
      "I've worked with other coaches before, but no one has ever understood the female athlete experience the way this team does.",
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=CW',
    title: 'Figure Competitor',
  },
  'patricia-h': {
    id: 'patricia-h',
    name: 'Patricia H.',
    quote:
      'My husband noticed the change before I did. Not just my body — my energy, my confidence, everything. Thank you, Team 4 Pro.',
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=PH',
    title: 'Lifestyle Client',
  },
  'karen-j': {
    id: 'karen-j',
    name: 'Karen J.',
    quote:
      "Helle's peak week protocol was flawless. I stepped on stage feeling the most confident I have ever felt.",
    avatar: 'https://placehold.co/80x80/4a9199/ffffff?text=KJ',
    title: 'Physique Competitor',
  },
} as const satisfies Record<TestimonialId, Testimonial>;

/**
 * Testimonials as an ordered array, derived from {@link testimonialsById}.
 * Order follows {@link testimonialIds} — the canonical display order.
 * Consumed by the success-stories overview page and the testimonial grid
 * and featured-testimonial components, which iterate by the `featured`
 * boolean rather than by ID lookup.
 */
const testimonials: readonly Testimonial[] = testimonialIds.map((id) => testimonialsById[id]);

// Export
export { testimonialIds, testimonials, testimonialsById };
export type { Testimonial, TestimonialId };
