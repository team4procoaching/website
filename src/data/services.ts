/**
 * Services domain data and helpers.
 * Canonical source for service and category metadata, homepage section
 * configuration, and lookup helpers used across the services page and
 * quiz flows.
 */

import type { FaqItem, ProcessStep } from './howItWorks';
import { routes } from './routes';

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Service category identifiers — single source of truth.
 * Used to derive the ServiceCategory type. Add new categories here;
 * TypeScript will flag every location that needs updating (including quiz.ts step2).
 */
const categoryIds = ['bodybuilding', 'athletic', 'wellness'] as const;

/** Service category type, derived from {@link categoryIds}. */
type ServiceCategory = (typeof categoryIds)[number];

/** Category metadata */
type CategoryInfo = {
  /** Category identifier */
  id: ServiceCategory;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
};

/**
 * Category metadata keyed by ID — compile-time completeness guarantee.
 * Adding a new ID to `categoryIds` without a record here is a compile error.
 */
const categoriesById = {
  bodybuilding: {
    id: 'bodybuilding',
    name: 'Bodybuilding',
    description:
      "Built for the stage — and for the years of work it takes to get there. Competition prep, off-season development, and posing coached by women who've been through it at the highest level. Your plan reflects your division, your timeline, and your body — not someone else's template.",
  },
  athletic: {
    id: 'athletic',
    name: 'Athletic',
    description:
      'For women who compete outside the stage — in the ring, on the platform, or on the course. Body composition matters in your sport, and your coaching should reflect that. We build plans around your competition calendar, weight class, and performance goals.',
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness',
    description:
      "You don't need a competition goal to train with IFBB Pros. This category is for women who want visible, lasting results — whether that means building muscle, losing fat, or finding a sustainable routine that fits a full life. Same expertise, same individualized approach, zero stage pressure.",
  },
} as const satisfies Record<ServiceCategory, CategoryInfo>;

/**
 * Categories as an ordered array, derived from {@link categoriesById}.
 * Order follows {@link categoryIds} — the canonical display order.
 */
const categories: readonly CategoryInfo[] = categoryIds.map((id) => categoriesById[id]);

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/**
 * Service identifiers — single source of truth.
 * Used to derive the ServiceId type. Add new services here; TypeScript will
 * flag every location that needs updating (quiz result hrefs,
 * highlightedServiceIds, card targets, future detail-page paths).
 */
const serviceIds = [
  'competition-prep',
  'off-season',
  'posing',
  'competition-ready',
  'level-up',
  'get-jacked',
  'get-lean',
  'beginner',
  'busy',
] as const;

/** Service identifier type, derived from {@link serviceIds}. */
type ServiceId = (typeof serviceIds)[number];

/** Available billing periods — single source of truth */
const billingPeriods = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'six-months', label: '6 Months' },
  { value: 'twelve-months', label: '12 Months' },
] as const;

/** Billing period value type derived from billingPeriods */
type BillingPeriod = (typeof billingPeriods)[number]['value'];

/** Default billing period for SegmentedControl initial selection */
const defaultPeriod: BillingPeriod = 'monthly';

/** Pricing option for a specific billing period */
type PricingOption = {
  /** Billing period identifier */
  period: BillingPeriod;
  /** Price display (e.g., "€149" or "€799") */
  price: string;
  /** Price suffix (e.g., "/month" or "one-time") */
  suffix: string;
  /** Optional note (e.g., "2 month minimum") */
  note?: string;
  /** Numeric price amount for structured data (JSON-LD, filters) */
  amount: number;
  /** ISO 4217 currency code — scoped to EUR while no other currency is offered */
  currency: 'EUR';
};

/** Service/program configuration */
type Service = {
  /** Unique identifier — must be a value from {@link serviceIds} */
  id: ServiceId;
  /** Service name */
  name: string;
  /** Tagline */
  tagline: string;
  /** Short description */
  description: string;
  /** Category this service belongs to */
  category: ServiceCategory;
  /** Pricing for each billing period */
  pricing: readonly PricingOption[];
  /**
   * List of included features.
   */
  features: readonly string[];
  /**
   * Contact-form deep-link for the card and detail-page CTAs. The name is
   * deliberately specific — a generic `href` would be ambiguous once each
   * service also gets a detail-page URL.
   */
  contactHref: string;

  // -------------------------------------------------------------------------
  // Optional detail-page content
  //
  // All fields below are optional so the schema can land before the content
  // does. The detail-page route renders blocks conditionally; missing
  // sections simply do not appear (graceful degradation). Content is
  // populated per service in a separate pass.
  // -------------------------------------------------------------------------

  /** Lead paragraph for the detail-page hero (3–5 sentences). */
  lead?: string;
  /**
   * Expanded feature descriptions (2–4 sentences each), used by the
   * "What's Included" section on the detail page.
   */
  detailedFeatures?: readonly {
    title: string;
    description: string;
  }[];
  /**
   * "Who this is for" — timing- and situation-based fits, never identity
   * statements (Conversion-review guideline).
   */
  fitFor?: readonly string[];
  /**
   * "Who this isn't for" — timing- and situation-based disqualifiers,
   * never identity statements.
   */
  notFitFor?: readonly string[];
  /**
   * IDs of testimonials that speak to this service.
   *
   * TODO: tighten to `readonly TestimonialId[]` once `src/data/testimonials.ts`
   * is migrated onto the ADR-0017 pattern (testimonialIds const, derived
   * TestimonialId type, testimonialsById record). See ARCHITECTURE.md →
   * Pending Work / Technical Debt.
   */
  testimonialIds?: readonly string[];
  /**
   * Service-specific FAQ entries for the detail-page accordion. Reuses
   * {@link FaqItem} from `~/data/howItWorks` so service FAQs and the
   * global FAQ surface share the same rendering primitive and shape.
   */
  faq?: readonly FaqItem[];
  /**
   * Service-specific overrides for the "How the coaching works" timeline.
   * When omitted, the detail page falls back to the global
   * {@link processSteps} from `~/data/howItWorks`.
   */
  processStepsOverride?: readonly ProcessStep[];
};

/**
 * Services keyed by ID — compile-time completeness guarantee.
 * Adding a new ID to `serviceIds` without a record here is a compile error;
 * renaming one breaks every call-site that references the old literal.
 */
const servicesById = {
  // ============================================
  // BODYBUILDING
  // ============================================
  'competition-prep': {
    id: 'competition-prep',
    name: 'Competition Prep',
    tagline: 'Peaking Perfectly, Safely, and Victoriously.',
    description:
      'Elite preparation for bikini, figure, or wellness competitors. Peak week expertise included.',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '€299',
        suffix: '/month',
        note: '3 month minimum',
        amount: 299,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,599',
        suffix: 'one-time',
        amount: 1599,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€2,899',
        suffix: 'one-time',
        amount: 2899,
        currency: 'EUR',
      },
    ],
    features: [
      'Contest-specific periodization',
      'Peak week protocol',
      'Posing coaching sessions',
      'Weekly check-ins during prep',
      'Competition day support',
      'Post-show reverse diet plan',
    ],
    contactHref: `${routes.contact}?service=competition-prep`,
  },
  'off-season': {
    id: 'off-season',
    name: 'Off-Season Muscle Building',
    tagline: 'Grow with Purpose.',
    description:
      'Strategic muscle building between shows. Maximize your improvements while staying stage-ready.',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '€249',
        suffix: '/month',
        note: '2 month minimum',
        amount: 249,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,349',
        suffix: 'one-time',
        amount: 1349,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€2,499',
        suffix: 'one-time',
        amount: 2499,
        currency: 'EUR',
      },
    ],
    features: [
      'Hypertrophy-focused programming',
      'Strategic caloric surplus planning',
      'Weak point analysis & improvement',
      'Bi-weekly progress assessments',
      'Supplement guidance',
    ],
    contactHref: `${routes.contact}?service=off-season`,
  },
  posing: {
    id: 'posing',
    name: 'Posing & Stage Presence',
    tagline: 'Own the Stage.',
    description:
      'Master your presentation. Posing can make or break your placement—learn from champions.',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '€149',
        suffix: '/session',
        amount: 149,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€799',
        suffix: '6 sessions',
        amount: 799,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,399',
        suffix: '12 sessions',
        amount: 1399,
        currency: 'EUR',
      },
    ],
    features: [
      'Division-specific posing',
      'Video analysis & feedback',
      'Stage presence coaching',
      'Competition walk-through',
      'Confidence building techniques',
    ],
    contactHref: `${routes.contact}?service=posing`,
  },

  // ============================================
  // ATHLETIC
  // ============================================
  'competition-ready': {
    id: 'competition-ready',
    name: 'Competition Ready',
    tagline: 'Make Weight. Keep Power.',
    description:
      'For combat sports and powerlifting athletes who need to peak for competition day.',
    category: 'athletic',
    pricing: [
      {
        period: 'monthly',
        price: '€249',
        suffix: '/month',
        note: '2 month minimum',
        amount: 249,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,349',
        suffix: 'one-time',
        amount: 1349,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€2,499',
        suffix: 'one-time',
        amount: 2499,
        currency: 'EUR',
      },
    ],
    features: [
      'Weight cut protocols',
      'Strength peaking program',
      'Competition day nutrition',
      'Recovery optimization',
      'Sport-specific conditioning',
    ],
    contactHref: `${routes.contact}?service=competition-ready`,
  },
  'level-up': {
    id: 'level-up',
    name: 'Level Up',
    tagline: 'Built for Your Sport.',
    description:
      'Sport-specific training for endurance athletes, martial artists, and team sport players.',
    category: 'athletic',
    pricing: [
      {
        period: 'monthly',
        price: '€199',
        suffix: '/month',
        note: '2 month minimum',
        amount: 199,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,099',
        suffix: 'one-time',
        amount: 1099,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,999',
        suffix: 'one-time',
        amount: 1999,
        currency: 'EUR',
      },
    ],
    features: [
      'Sport-specific programming',
      'Performance periodization',
      'Injury prevention protocols',
      'Energy system development',
      'Competition scheduling',
    ],
    contactHref: `${routes.contact}?service=level-up`,
  },

  // ============================================
  // WELLNESS
  // ============================================
  'get-jacked': {
    id: 'get-jacked',
    name: 'Get Jacked',
    tagline: 'Look Like You Lift.',
    description: 'Serious muscle building for women who want to stand out. No fluff, just results.',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '€199',
        suffix: '/month',
        note: '2 month minimum',
        amount: 199,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,099',
        suffix: 'one-time',
        amount: 1099,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,999',
        suffix: 'one-time',
        amount: 1999,
        currency: 'EUR',
      },
    ],
    features: [
      'Progressive overload programming',
      'Muscle-building nutrition plan',
      'Form coaching & video reviews',
      'Bi-weekly check-ins',
      'Supplement recommendations',
    ],
    contactHref: `${routes.contact}?service=get-jacked`,
  },
  'get-lean': {
    id: 'get-lean',
    name: 'Get Lean',
    tagline: 'Reveal Your Best Self.',
    description:
      'Strategic fat loss while preserving muscle. Sustainable approach, no crash diets.',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '€199',
        suffix: '/month',
        note: '2 month minimum',
        amount: 199,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,099',
        suffix: 'one-time',
        amount: 1099,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,999',
        suffix: 'one-time',
        amount: 1999,
        currency: 'EUR',
      },
    ],
    features: [
      'Personalized caloric deficit',
      'Flexible dieting approach',
      'Metabolic adaptation management',
      'Weekly accountability check-ins',
      'Reverse diet exit strategy',
    ],
    contactHref: `${routes.contact}?service=get-lean`,
  },
  beginner: {
    id: 'beginner',
    name: "I'm New to This",
    tagline: 'Start Strong, Start Right.',
    description:
      'Perfect for women starting their fitness journey. Build a strong foundation with expert guidance.',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '€149',
        suffix: '/month',
        note: '2 month minimum',
        amount: 149,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€799',
        suffix: 'one-time',
        amount: 799,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,399',
        suffix: 'one-time',
        amount: 1399,
        currency: 'EUR',
      },
    ],
    features: [
      'Fundamentals-focused training',
      'Nutrition basics education',
      'Weekly form video reviews',
      'Habit building support',
      'Private community access',
    ],
    contactHref: `${routes.contact}?service=beginner`,
  },
  busy: {
    id: 'busy',
    name: "I'm Too Busy",
    tagline: 'Maximum ROI for Your Time.',
    description: 'Efficient training for busy professionals. Get results with 3-4 hours per week.',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '€179',
        suffix: '/month',
        note: '2 month minimum',
        amount: 179,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€979',
        suffix: 'one-time',
        amount: 979,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€1,799',
        suffix: 'one-time',
        amount: 1799,
        currency: 'EUR',
      },
    ],
    features: [
      'Time-efficient workouts (45-60 min)',
      'Flexible scheduling options',
      'Quick meal prep strategies',
      'Travel workout alternatives',
      'Stress management integration',
    ],
    contactHref: `${routes.contact}?service=busy`,
  },
} as const satisfies Record<ServiceId, Service>;

/**
 * All services as an ordered array, derived from {@link servicesById}.
 * Order follows {@link serviceIds} — the canonical display order.
 */
const services: readonly Service[] = serviceIds.map((id) => servicesById[id]);

/**
 * Get a service by its ID. Direct record lookup — no array search needed.
 *
 * Relies on the `as const satisfies Record<ServiceId, Service>`
 * completeness guarantee so the lookup cannot miss at compile time.
 */
function getServiceById(id: ServiceId): Service {
  return servicesById[id];
}

/** Get services filtered by category. */
function getServicesByCategory(category: ServiceCategory): readonly Service[] {
  return services.filter((service) => service.category === category);
}

/**
 * Detail-page URL for a service. Lives next to the data rather than in
 * routes.ts because the derivation belongs with the domain — routes.ts
 * stays a pure path dictionary, and future detail-route helpers
 * (`coachDetailHref`, `successStoryDetailHref`) can follow the same
 * co-location pattern without growing routes.ts into a method bag.
 *
 * Consumed by the upcoming `/services/[slug]` route and the ServiceCard
 * "Learn more" target.
 */
function serviceDetailHref(id: ServiceId): string {
  return `${routes.services}/${id}`;
}

/**
 * Get services by their IDs. Validates that all IDs exist — throws if a
 * requested ID is not found, preventing silent mismatches after renames.
 *
 * The `ServiceId` parameter type catches invalid IDs at compile time; the
 * runtime guard still fires for callers who bypass the type system via
 * `as ServiceId` casts (e.g., deserialized URL params, test fixtures).
 */
function getServicesByIds(ids: readonly ServiceId[]): readonly Service[] {
  return ids.map((id) => {
    const service = servicesById[id];
    if (!service) {
      throw new Error(
        `Service not found: "${id}". The services catalog in src/data/services.ts is the single source of truth for service IDs; this guard catches IDs that bypass the compile-time ServiceId check via casts (e.g., deserialized URL params, test fixtures).`,
      );
    }
    return service;
  });
}

// ---------------------------------------------------------------------------
// Homepage section
// ---------------------------------------------------------------------------

/** Services section configuration (for homepage) */
type ServicesSection = {
  /** Section headline */
  headline: string;
  /** Intro text below headline */
  intro: string;
  /** Service IDs to highlight on the homepage (curated selection) */
  highlightedServiceIds: readonly ServiceId[];
  /** Link to all services page */
  allServicesLink: {
    label: string;
    href: string;
  };
};

const servicesSection: ServicesSection = {
  headline: 'Our Most Popular Services',
  intro:
    'Choose the program that fits your goals. All packages include direct access to your IFBB Pro coach and our private community.',
  highlightedServiceIds: ['competition-prep', 'competition-ready', 'get-jacked'],
  allServicesLink: {
    label: 'Browse All Services',
    href: routes.services,
  },
} as const;

// Export
export {
  billingPeriods,
  categories,
  categoryIds,
  defaultPeriod,
  getServiceById,
  getServicesByCategory,
  getServicesByIds,
  serviceDetailHref,
  serviceIds,
  services,
  servicesSection,
};
export type {
  BillingPeriod,
  CategoryInfo,
  PricingOption,
  Service,
  ServiceCategory,
  ServiceId,
  ServicesSection,
};
