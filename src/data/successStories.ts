/**
 * Success stories data, types, and display helpers.
 *
 * ARCHITECTURE NOTE — Division of Responsibilities:
 *
 * This file owns:
 * - Story data (inline, sorted by name)
 * - Shared types (ProgramId, SuccessStory, StoryDetail, StoryWithDetail)
 *   and imported CoachId from coaches.ts
 * - Display labels (programLabels, sectionLabels)
 * - Homepage section config (successStoriesSection)
 * - Detail-page helpers (successStoryDetailHref, hasDetailPage,
 *   relatedStoriesFor)
 *
 * Components consume SuccessStory objects via props — consistent with other
 * domain data modules (coaches, testimonials, stats, USPs).
 */

import type { CoachId } from '~/data/coaches';
import { routes } from '~/data/routes';
import type { Stat } from '~/data/stats';
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
 * Display labels for the StoryDetail narrative sections.
 *
 * Field names in the schema stay semantic (startingPoint, turningPoint, …);
 * these labels are applied at the page level so re-labelling a section never
 * requires a schema migration. First-person voice — the labels read as
 * fragments from the storyteller, not as marketing headers.
 */
const sectionLabels = {
  startingPoint: 'Where I started',
  whatIWasLookingFor: 'What I was looking for',
  howWeWorked: 'How we worked',
  turningPoint: 'The moment it clicked',
  results: 'What changed',
  pastSelfMessage: 'If I could tell my past self',
} as const;

/**
 * Long-form content for a success-story detail page. Composed of narrative
 * blocks, structured stats, a coach note, and a progress image.
 *
 * Field names stay semantic (startingPoint, turningPoint, …); display
 * labels (e.g. "Where I started", "The moment it clicked") are applied
 * at the component level via a label map, so re-labelling does not
 * require a schema migration.
 */
type StoryDetail = {
  /** "Where I started" — opening narrative, ~60–120 words. */
  startingPoint: string;
  /**
   * "What I was looking for" — motivation, ~40–80 words. Switcher
   * stories include explicit comparison to a previous coach.
   */
  whatIWasLookingFor: string;
  /** "How we worked" — process and individualization, ~80–140 words. */
  howWeWorked: string;
  /**
   * "The moment it clicked" — emotional turning point, ~60–100 words.
   * Visually anchored by progressImage.
   */
  turningPoint: string;
  /**
   * Mid-section pull-quote. A different sentence from SuccessStory.quote
   * so the reader never sees the same line twice across overview and
   * detail.
   */
  pullQuote: string;
  /**
   * "If I could tell my past self" — final peer-address pull-quote,
   * 1–2 sentences.
   */
  pastSelfMessage: string;
  /** Hero process-strip metrics (check-ins, plan adjustments, …). 3–4 tiles. */
  processStats: readonly Stat[];
  /** Result-grid metrics (before → after per measured value). 3–4 tiles. */
  results: readonly Stat[];
  /**
   * One to two sentences about how this coach worked with this client.
   * Rendered in the in-place coach card on the detail page.
   */
  coachNote: string;
  /** Progress image rendered in the "moment it clicked" block. */
  progressImage: {
    image: ImageSource;
    alt: string;
    caption?: string;
  };
};

/**
 * Success story shape consumed by components (cards, grids).
 *
 * The slug/age/detail fields are optional at the type level but enforced
 * as a triple by the hasDetailPage type guard — partial population is
 * not a valid state. Stories are either legacy (none of the three set,
 * static card) or detail-eligible (all three set, detail page exists).
 */
type SuccessStory = {
  /** Client name */
  name: string;
  /** Before transformation image */
  beforeImage: ImageSource;
  /** After transformation image */
  afterImage: ImageSource;
  /**
   * Transformation summary — metric only. Do not embed duration here; it
   * lives in the `duration` field. Rendering call-sites (detail-page meta
   * description, grid-card subline) combine the two, so an embedded
   * duration would duplicate downstream.
   */
  transformation: string;
  /** Coaching program type */
  program: ProgramId;
  /** Assigned coach */
  coach: CoachId;
  /**
   * Short client quote — teaser only.
   *
   * Used on overview cards (homepage slider, /success-stories grid) as the
   * snippet under the transformation line. The detail page does **not**
   * render this quote; it uses separate fields for its mid-section break
   * and its final pull-quote, so the reader never sees the same sentence
   * twice across overview and detail.
   */
  quote: string;
  /** Transformation duration, e.g. "6 months" */
  duration: string;
  /**
   * URL slug for the detail page. When set, the story has a detail page
   * at /success-stories/<slug>; the overview card renders a link.
   * When undefined, the story renders as a static card.
   */
  slug?: string;
  /**
   * Client age at the start of the program. Required when slug is set
   * (enforced by hasDetailPage). Used in the detail-page hero as a
   * persona-match anchor; not displayed on overview cards.
   */
  age?: number;
  /**
   * Long-form detail content. Required when slug is set (enforced by
   * hasDetailPage).
   */
  detail?: StoryDetail;
};

/**
 * A success story narrowed to the detail-eligible shape. Slug, age, and
 * detail are guaranteed present.
 */
type StoryWithDetail = SuccessStory & Required<Pick<SuccessStory, 'slug' | 'age' | 'detail'>>;

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
    transformation: 'Lost 30lbs',
    program: 'lifestyle',
    coach: 'gina',
    quote:
      'Working with Gina changed my entire relationship with food and fitness. For the first time, I feel strong and confident.',
    duration: '6 months',
    slug: 'sarah-m',
    age: 34,
    detail: {
      // PLACEHOLDER content per owner direction — pilot real text comes
      // after the rendered page is reviewed in the browser. Tone aims at
      // the Plateau persona (training for years without progress).
      startingPoint:
        'I had been training for years without seeing the changes I wanted. Every program promised the world; none of them held up. By the time I reached out, I was tired of starting over.',
      whatIWasLookingFor:
        'I wanted a coach who would actually look at my numbers, not hand me a template. Someone who would adjust the plan when life changed, not pretend life never does.',
      howWeWorked:
        'Gina built the plan around my actual schedule and adjusted every two weeks. We did form-review videos for the lifts I struggled with, and she rewrote the nutrition twice when my training response shifted. I felt heard, not managed.',
      turningPoint:
        'The first time I hit a squat at my pre-pregnancy weight, I sat on the gym floor and cried. Not because of the lift — because I had stopped believing it was possible.',
      pullQuote: 'For the first time, the plan moved with me instead of against me.',
      pastSelfMessage:
        'You do not need a new program. You need someone who will actually pay attention. Find that, and the rest follows.',
      processStats: [
        { target: 24, label: 'weekly check-ins' },
        { target: 12, label: 'plan adjustments' },
        { target: 8, label: 'form-review videos' },
        { target: 200, suffix: '+', label: 'messages exchanged' },
      ],
      results: [
        { target: 30, suffix: ' lbs', label: 'lost' },
        { target: 3, label: 'sizes down' },
        { target: 45, prefix: '+', suffix: ' lbs', label: 'squat PR' },
        { target: 6, suffix: ' months', label: 'from start' },
      ],
      coachNote:
        "Gina built every adjustment around adherence — small changes every two weeks instead of monthly resets, because Sarah's shift work made any other rhythm impossible.",
      progressImage: {
        image: remoteImage(
          'https://placehold.co/1200x800/4a9199/f7eee5?text=Month+3+Progress',
          1200,
          800,
        ),
        alt: 'Sarah at month three of the program',
        caption: 'Month 3: first squat at pre-pregnancy weight',
      },
    },
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

/**
 * Detail-page URL for a success story. Lives next to the data rather than in
 * routes.ts because the derivation belongs with the domain — routes.ts stays
 * a pure path dictionary, and detail-route helpers co-locate with their data
 * module (cf. `serviceDetailHref` in `~/data/services` for the established
 * pattern).
 *
 * Expects a slug from a detail-eligible story. Used by the
 * `/success-stories/[slug]` route and the overview-card link.
 */
function successStoryDetailHref(slug: string): string {
  return `${routes.successStories}/${slug}`;
}

/**
 * Type guard distinguishing detail-eligible stories from legacy entries.
 * A story has a detail page if and only if slug, age, and detail are
 * all defined; partial state is not a valid shape and the explicit
 * triple check makes that intent visible.
 *
 * Used by getStaticPaths in /success-stories/[slug], by the conditional
 * link in SuccessStoryGridCard, and by relatedStoriesFor.
 */
function hasDetailPage(story: SuccessStory): story is StoryWithDetail {
  return story.slug !== undefined && story.age !== undefined && story.detail !== undefined;
}

/**
 * Build the related-stories list for a detail page. Cascades through
 * three buckets of detail-eligible stories — same program, then same
 * coach but different program, then any other detail story — and falls
 * back to legacy stories (rendered as static cards) if the detail pool
 * does not fill the limit. Within each bucket, stories are sorted
 * alphabetically by name for deterministic output.
 *
 * The current story is always excluded. The result has at most `limit`
 * entries; fewer if the candidate pool is smaller.
 */
function relatedStoriesFor(
  current: StoryWithDetail,
  all: readonly SuccessStory[],
  limit = 3,
): readonly SuccessStory[] {
  const byName = (a: SuccessStory, b: SuccessStory): number => a.name.localeCompare(b.name);

  const candidates = all.filter((s) => s.slug !== current.slug);
  const detailCandidates = candidates.filter(hasDetailPage);
  const legacyCandidates = candidates.filter((s) => !hasDetailPage(s)).sort(byName);

  const sameProgram = detailCandidates.filter((s) => s.program === current.program).sort(byName);
  const sameCoach = detailCandidates
    .filter((s) => s.coach === current.coach && s.program !== current.program)
    .sort(byName);
  const otherDetail = detailCandidates
    .filter((s) => s.program !== current.program && s.coach !== current.coach)
    .sort(byName);

  return [...sameProgram, ...sameCoach, ...otherDetail, ...legacyCandidates].slice(0, limit);
}

// Export
export {
  hasDetailPage,
  programIds,
  programLabels,
  relatedStoriesFor,
  sectionLabels,
  successStories,
  successStoriesSection,
  successStoryDetailHref,
};
export type { ProgramId, StoryDetail, StoryWithDetail, SuccessStoriesSection, SuccessStory };
