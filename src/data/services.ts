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
  'performance-ready',
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
  /** Price display (e.g., "$149" or "$799") */
  price: string;
  /** Price suffix (e.g., "/month" or "one-time") */
  suffix: string;
  /** Optional note (e.g., "2 month minimum") */
  note?: string;
  /** Numeric price amount for structured data (JSON-LD, filters) */
  amount: number;
  /** ISO 4217 currency code — scoped to USD while no other currency is offered */
  currency: 'USD';
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
 * A service narrowed to the detail-page-eligible shape: lead, detailedFeatures,
 * fitFor, and faq are guaranteed present. Produced by
 * {@link hasCompleteDetailContent} so the detail-page route and its section
 * components can consume the optional fields without per-site
 * optional-chaining.
 *
 * Mirrors the {@link import('./successStories').StoryWithDetail} pattern for
 * `/success-stories/[slug]` — same idea, different domain shape. TypeScript
 * cannot express "non-empty array" structurally; the arity threshold (>= 3)
 * lives in the runtime guard, the type only marks the fields required.
 */
type ServiceWithCompleteDetailContent = Service & {
  lead: NonNullable<Service['lead']>;
  detailedFeatures: NonNullable<Service['detailedFeatures']>;
  fitFor: NonNullable<Service['fitFor']>;
  faq: NonNullable<Service['faq']>;
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
    description: 'IFBB Pro Coach',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '$299',
        suffix: '/month',
        note: '3 month minimum',
        amount: 299,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$1,599',
        suffix: 'one-time',
        amount: 1599,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$2,899',
        suffix: 'one-time',
        amount: 2899,
        currency: 'USD',
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
    lead: "Competing at the highest level requires more than a training plan — it requires a coach who has stood on that stage and knows what it takes to win. At Team 4 Pro, you work with one dedicated IFBB Pro coach who knows your body, your division, and your timeline inside and out. What sets us apart is the brain trust behind your coach — three IFBB Pro champions who collaborate and consult so that the expertise shaping your prep goes beyond what any single coach could offer alone.\n\nWe coach all divisions — Bikini, Figure, Wellness, Fitness, Women's Physique, and all men's categories. From your first assessment through to competition day, every variable is managed: your resistance training, nutrition, cardio, supplementation, and peak week protocol are all built specifically for you — not adapted from a generic template. Weekly check-ins keep your coach accountable to your progress and your program adjusted in real time.\n\nPrep doesn't end when you walk off the stage. Your coach will guide you through a structured reverse diet to protect your physique and your health as you transition into your improvement season, so the work you put in carries forward.",
    detailedFeatures: [
      {
        title: 'Lab Review & Health Optimization',
        description:
          'Your prep begins with a full review of your bloodwork and health markers. Your coach uses this data to customize your plan around your individual physiology — identifying any deficiencies, optimizing your hormonal environment, and making targeted supplementation recommendations that support both your performance and your long-term health. You are not just prepped to look your best — you are prepped to feel your best getting there.',
      },
      {
        title: 'Customized Periodized Training, Nutrition & Cardio',
        description:
          "Every element of your program is built specifically for you — not adapted from a template. Your training is periodized around your show date, progressing intentionally through each phase of prep. Your nutrition is structured to support fat loss while preserving the muscle you've built, with cardio layered in strategically as your prep advances. As your body responds, your coach adjusts to keep you progressing towards your stage goals.",
      },
      {
        title: 'Peak Week Protocol',
        description:
          'Peak week is where prep is won or lost, and it requires a coach who has been there. Your peak week protocol is built around your individual response — water and electrolyte management, carbohydrate timing, training adjustments, and day-of strategy are all mapped out in advance so there are no surprises when it matters most. You arrive on stage knowing exactly what to do and why.',
      },
      {
        title: 'Post-Show Reverse & Off-Season Management',
        description:
          'The show is the finish line of prep — not the finish line of coaching. Your coach will guide you through a structured reverse diet designed to protect your metabolism and your mental health as you transition out of competition mode. Off-season targets are established so your improvement season has direction from day one and you come back to the stage better than you left it.',
      },
    ],
    fitFor: [
      'Either you have a show planned or want to discuss show strategy with your coach. Just be ready to commit to a date and the process',
      'You want every variable managed — training, nutrition, cardio, supplementation, and peak week — by a coach who has done it at the highest level',
      'You are willing to submit weekly check-ins, progress photos, and performance data so your coach can make real-time adjustments',
      'You want to arrive on stage knowing you left nothing on the table',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },
  'off-season': {
    id: 'off-season',
    name: 'Off-Season Muscle Building',
    tagline: 'Grow with Purpose.',
    description: 'IFBB Pro Coach',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '$249',
        suffix: '/month',
        note: '2 month minimum',
        amount: 249,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$1,349',
        suffix: 'one-time',
        amount: 1349,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$2,499',
        suffix: 'one-time',
        amount: 2499,
        currency: 'USD',
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
    lead: "The off-season is where champions are built — and it's the phase most athletes get wrong. Eating too much, eating too little, training without direction, or losing sight of the stage entirely. At Team 4 Pro, your improvement season is treated with the same precision and intention as your prep. Your dedicated IFBB Pro coach will develop a structured plan designed to maximize your muscle development while keeping your physique moving in the right direction.\n\nYour program is built around progressive overload, strategic nutrition, and regular weak point analysis so that every off-season cycle brings you to the stage in a better position than the last. Weekly assessments keep your coach tracking your response and adjusting your plan accordingly. Supplementation guidance is included to support your training and recovery throughout the process.\n\nThis is not a free-for-all eating phase. This is intentional, strategic development — coached by women who have done it at the highest level and know exactly what it takes to come back to the stage better.",
    detailedFeatures: [
      {
        title: 'Lab Review & Health Optimization',
        description:
          'Your coach reviews your bloodwork and health markers to assess your hormonal environment, identify any deficiencies, and make targeted supplementation recommendations that accelerate your recovery and set the foundation for productive muscle building. Your off-season plan is built around your individual physiology, not a generic bulk template.',
      },
      {
        title: 'Customized Progressive Training & Nutrition',
        description:
          'Your training is built around progressive overload principles designed to systematically develop your weak points and build the physique improvements that will matter on stage. Nutrition is structured to support muscle growth in a controlled surplus — not an eating free-for-all. As your body responds, your coach adjusts to keep your development on track and your physique moving in the right direction.',
      },
      {
        title: 'Weak Point Analysis & Ongoing Assessment',
        description:
          "Every off-season block starts with an honest assessment of where you placed, where you were weak, and where the biggest improvements need to happen. Weekly progress assessments keep your coach tracking your response and identifying what is and isn't working, so your time in the off-season is used with intention.",
      },
      {
        title: 'Prep Transition Planning',
        description:
          'A good off-season ends with a clear plan for the next prep. Your coach will establish your starting point, show date targets, and the conditioning benchmarks you need to hit before prep begins — so you transition from improvement season to prep with direction and confidence.',
      },
    ],
    fitFor: [
      'You have recently competed or are between prep cycles and want to build with purpose',
      'You want a structured plan that maximizes muscle development without losing sight of your stage goals',
      'You are ready to commit to progressive training and structured nutrition outside of prep season',
      'You want a coach who will hold you accountable through the phase that most athletes treat as a break',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },
  posing: {
    id: 'posing',
    name: 'Posing & Stage Presence',
    tagline: 'Own the Stage.',
    description: 'IFBB Pro Coach',
    category: 'bodybuilding',
    pricing: [
      {
        period: 'monthly',
        price: '$150',
        suffix: 'Per Session',
        amount: 150,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$700',
        suffix: 'Pack of 5',
        amount: 700,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$1,250',
        suffix: 'Pack of 10',
        amount: 1250,
        currency: 'USD',
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
    lead: 'Placings are won and lost in the presentation. A perfectly conditioned physique presented poorly will risk losing to a slightly less conditioned athlete who owns the stage. At Team 4 Pro, posing is treated as a skill — one that requires coaching, repetition, and refinement, not something you figure out two weeks before your show.\n\nYour sessions are conducted via online video, with a coach who understands the specific requirements of your division inside and out. Whether you are stepping on stage for the first time and learning mandatory poses from scratch, or a seasoned competitor looking to sharpen your execution and elevate your stage presence, we meet you where you are and build from there.\n\nWe also choreograph and review posing routines, provide photo and video analysis with detailed feedback, and coach the confidence and stage walk that separates a good competitor from one the judges remember.',
    detailedFeatures: [
      {
        title: 'Division-Specific Posing Instruction',
        description:
          "Every division has its own mandatory poses, quarter turns, and presentation standards — and the details matter to a judge's eye. Your coach teaches you the specific requirements of your division, ensuring your mandatory poses showcase your strengths and minimize your weaknesses. No guessing, no generic posing advice.",
      },
      {
        title: 'Video Analysis & Detailed Feedback',
        description:
          'Your sessions are conducted via online video with live coaching and photo review so you can see exactly what the judges see. Detailed feedback covers your angles, transitions, facial expression, and overall presentation so every session produces measurable improvement.',
      },
      {
        title: 'Routine Choreography & Stage Walk',
        description:
          'A great routine tells a story and leaves an impression. Your coach choreographs your posing routine to highlight your best assets, teaches you the stage walk that commands attention, and builds the confidence that separates competitors who place from competitors who are remembered.',
      },
      {
        title: 'Ongoing Refinement',
        description:
          'Posing is not a one-session skill. Your coach works with you through a series of sessions leading up to your show, refining your execution at every stage so that by competition day your presentation is automatic, confident, and stage-ready.',
      },
    ],
    fitFor: [
      'You have a show coming up and want to ensure your presentation matches the condition you bring to the stage',
      'You are new to competing and need to learn the mandatory poses and stage requirements for your division',
      'You are a seasoned competitor who wants to sharpen your execution, improve your routine, or elevate your stage presence',
      'You want photo and video analysis with detailed feedback from a coach who has judged and competed at the highest level',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },

  // ============================================
  // ATHLETIC
  // ============================================
  'performance-ready': {
    id: 'performance-ready',
    name: 'Performance Ready',
    tagline: 'Built for Your Sport. Ready for Competition Day.',
    description: 'IFBB Pro Coach',
    category: 'athletic',
    pricing: [
      {
        period: 'monthly',
        price: '$249',
        suffix: '/month',
        note: '2 month minimum',
        amount: 249,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$1,349',
        suffix: 'one-time',
        amount: 1349,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$2,499',
        suffix: 'one-time',
        amount: 2499,
        currency: 'USD',
      },
    ],
    features: [
      'Sport-specific programming & periodization',
      'Weight cut and competition-day protocols',
      'Body composition & performance nutrition',
      'Injury prevention & recovery integration',
      'Lab review & supplementation guidance',
    ],
    contactHref: `${routes.contact}?service=performance-ready`,
    lead: 'You compete — and your body needs to be ready for it. Whether you are cutting to a weight class for combat sports or powerlifting, peaking for a track or field event, training for a triathlon, marathon, or obstacle race, or competing in team sports, your coaching needs to be built around your performance calendar and the specific demands of your sport — not a generic fitness template.\n\nAt Team 4 Pro, your dedicated coach builds your plan around your sport, your timeline, and your body. For weight-class athletes, cut protocols are designed to protect your strength and performance while hitting your target. For endurance and field athletes, programming is periodized to develop the aerobic capacity, strength, and resilience your sport demands. Injury prevention is built in from the start — because staying healthy and on the course, field, or platform is as important as performing when you get there.\n\nThis is performance coaching for women who take their sport seriously and want their training to reflect that.',
    detailedFeatures: [
      {
        title: 'Lab Review & Health Optimization',
        description:
          'Training and competing places real demands on your body. Your coach reviews your bloodwork and health markers to establish your baseline, identify any factors that could compromise your performance or recovery, and build supplementation recommendations that support your training load and competition-day output.',
      },
      {
        title: 'Sport-Specific Programming & Periodization',
        description:
          "Your training is designed around the physical demands of your sport and periodized around your competition schedule. For weight-class athletes this means strength peaking and a precision cut protocol. For endurance athletes it means building aerobic capacity, strength, and race-day readiness. For team sport and field athletes it means developing the power, speed, and structural resilience your sport requires. Every program is built for your sport — not borrowed from someone else's.",
      },
      {
        title: 'Body Composition & Performance Nutrition',
        description:
          'Body composition matters in every sport. Your coach builds a nutrition plan designed to fuel your training, support your recovery, and optimize your power-to-weight ratio or endurance capacity — structured around your competition calendar so your nutrition peaks when your performance needs to. For weight-class athletes, competition day nutrition and rehydration strategy are mapped out in full.',
      },
      {
        title: 'Injury Prevention & Recovery Protocols',
        description:
          'The best training plan is the one you can complete. Injury prevention is integrated into your programming from the start — addressing mobility, movement quality, and structural balance so you stay on the field, the mat, the course, or the platform. Recovery protocols ensure your body absorbs the training load and arrives at competition day fresh, not depleted.',
      },
    ],
    fitFor: [
      'You compete in any sport — combat sports, powerlifting, endurance events, team sports, or otherwise — and want coaching that understands the demands of your discipline',
      'You need a periodized plan built around your competition calendar, not a generic training template',
      'You want to improve your body composition and physical performance without compromising your sport-specific training',
      'You are ready to commit to structured nutrition and programming designed to bring your best on competition day',
      'You want injury prevention integrated into your training so you can stay consistent and competitive throughout your season',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },

  // ============================================
  // WELLNESS
  // ============================================
  'get-jacked': {
    id: 'get-jacked',
    name: 'Get Jacked',
    tagline: 'Look Like You Lift.',
    description: 'IFBB Pro Coach',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '$199',
        suffix: '/month',
        note: '2 month minimum',
        amount: 199,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$1,099',
        suffix: 'one-time',
        amount: 1099,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$1,999',
        suffix: 'one-time',
        amount: 1999,
        currency: 'USD',
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
    lead: "You are not training for a stage. You are training because you want to look and feel like someone who takes this seriously — and you want results that are visible, not just on the scale. Get Jacked is for women who want to build real muscle, change the shape of their body, and do it with a program that actually knows what it's doing.\n\nYour dedicated IFBB Pro coach will build a progressive overload program designed specifically for your body and your goals, paired with a nutrition plan that supports muscle growth without unnecessary guesswork. Form coaching and video reviews keep your technique sharp and your training effective. Weekly check-ins track your progress and keep your program moving forward.",
    detailedFeatures: [
      {
        title: 'Lab Review & Health Optimization',
        description:
          'Building muscle effectively starts with understanding your body. Your coach reviews your bloodwork and health markers to identify any hormonal or nutritional factors that could be limiting your progress, and builds supplementation recommendations that support your training performance, recovery, and long-term health.',
      },
      {
        title: 'Customized Progressive Training Program',
        description:
          'Your program is built around progressive overload principles that systematically challenge your muscles and drive the adaptations that change your body. Every exercise, set, and rep scheme is chosen with purpose. Form coaching and periodic video reviews keep your technique sharp and your training productive as the loads increase.',
      },
      {
        title: 'Muscle-Building Nutrition Plan',
        description:
          'You cannot out-train poor nutrition when building muscle. Your coach builds a personalized nutrition plan that supports muscle growth, manages your energy levels, and gives you a practical approach to eating that you can maintain — not a rigid meal plan that falls apart the moment real life happens.',
      },
      {
        title: 'Weekly Check-Ins & Program Progression',
        description:
          'Weekly check-ins keep your coach informed and your program progressing. Your coach reviews your data, assesses your response, and adjusts your program as needed so you are always moving forward — not spinning your wheels on a plan that stopped working weeks ago.',
      },
    ],
    fitFor: [
      'You want to build visible muscle and change the shape of your body — not just lose weight',
      'You are ready to train with structure and intention, not just show up and go through the motions',
      'You want a coach who will build a program around your body and your goals, not hand you a template',
      'You are committed to weekly check-ins and putting in the work required to see real results',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },
  'get-lean': {
    id: 'get-lean',
    name: 'Get Lean',
    tagline: 'Reveal Your Best Self.',
    description: 'IFBB Pro Coach',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '$199',
        suffix: '/month',
        note: '2 month minimum',
        amount: 199,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$1,099',
        suffix: 'one-time',
        amount: 1099,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$1,999',
        suffix: 'one-time',
        amount: 1999,
        currency: 'USD',
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
    lead: 'Whether you are a busy parent, a student, or simply someone who has tried diet after diet without lasting results — Get Lean is built for real life. Fat loss done wrong costs you energy, makes you miserable, and leaves you worse off than when you started. At Team 4 Pro, we take a smarter approach: one that fits your lifestyle, protects your health, and produces results you can actually maintain.\n\nYour coach builds a personalized nutrition plan around a caloric deficit that works for your body and your schedule — no extreme restriction, no crash dieting, no meal plans that require hours of prep. The approach is flexible enough to survive weekends, social events, and the realities of a full life, while structured enough to actually move the needle.\n\nWeekly check-ins keep you on track and your coach informed. When you reach your goal, the transition out is managed just as carefully as the process that got you there — so you keep the results you worked for.',
    detailedFeatures: [
      {
        title: 'Personalized Fat Loss Nutrition Plan',
        description:
          'Your nutrition plan is built around a caloric deficit calibrated for your body, your goals, and your lifestyle. No rigid meal plans, no foods that are off limits, no approach that collapses under real-life pressure. Your coach gives you a practical framework you can actually follow — one built around flexibility, sustainability, and results that last.',
      },
      {
        title: 'Metabolic Management',
        description:
          'One of the most common reasons fat loss stalls is that the body adapts. Your coach monitors your progress and makes the adjustments needed to keep things moving — whether that means a small change to your intake, a diet break, or a shift in your activity. Nothing is set and forgotten. Your plan evolves with you.',
      },
      {
        title: 'Lifestyle-Friendly Training Support',
        description:
          "You don't need to spend hours in the gym to see results. Your coach designs a training approach that fits your schedule, your access to equipment, and your current fitness level — and builds it to complement your nutrition so that the two work together rather than against each other.",
      },
      {
        title: 'Weekly Check-Ins & Sustainable Exit Planning',
        description:
          'Weekly check-ins keep you accountable and give your coach the information needed to keep your plan working for you. When you reach your goal, the transition out of your fat loss phase is planned and managed so you maintain your results rather than reverting to where you started.',
      },
    ],
    fitFor: [
      'You want to lose fat and feel better in your body without extreme dieting or giving up your social life',
      'You have tried losing weight before but struggled with consistency, sustainability, or knowing what to actually do',
      'You want a flexible, practical approach to nutrition that fits around your real schedule — whether you are a busy parent, student, or professional',
      "You are ready to commit to a sustainable process and weekly accountability rather than a quick fix that doesn't last",
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },
  beginner: {
    id: 'beginner',
    name: "I'm New to This",
    tagline: 'Start Strong, Start Right.',
    description: 'IFBB Pro Coach',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '$149',
        suffix: '/month',
        note: '2 month minimum',
        amount: 149,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$799',
        suffix: 'one-time',
        amount: 799,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$1,399',
        suffix: 'one-time',
        amount: 1399,
        currency: 'USD',
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
    lead: "The gym can feel overwhelming when you don't know where to start — and most people who go it alone waste months, or even years, figuring out things a good coach could have taught them in weeks. If you are new to training and nutrition, this is where you begin: with an IFBB Pro coach who has taught people at every level and knows how to build a foundation that actually lasts.\n\nYour program starts with the fundamentals: how to move well, how to train progressively, and how to approach nutrition in a way that makes sense for your life. Periodic form reviews keep your technique on track from the start so you build good habits, stay safe, and avoid the injuries that come from doing too much too soon.\n\nThis is not a program that talks down to you. It is expert coaching that meets you exactly where you are and builds you into the person you want to become.",
    detailedFeatures: [
      {
        title: 'Foundation Movement & Technique Coaching',
        description:
          'Learning to move well from the start is the most valuable investment you can make in your training. Your coach builds your program around foundational movement patterns and teaches you the technique that makes every exercise safe, effective, and progressively challenging. Periodic form reviews catch issues early so you build confidence and competence from the ground up — and avoid the injuries that come from poor mechanics under load.',
      },
      {
        title: 'Beginner-Friendly Nutrition Basics',
        description:
          "Nutrition doesn't have to be complicated — and it shouldn't be when you are just starting out. Your coach builds a practical nutrition plan around the basics: enough protein, enough energy to support your training, and a flexible approach that fits into your real life. No extreme protocols, no overwhelming tracking requirements — just the fundamentals done well.",
      },
      {
        title: 'Progressive Programming',
        description:
          'Your program progresses at a pace that matches your development. Each phase builds on the last — introducing new movements, increasing load, and expanding your training capacity as your body adapts. You are never thrown in the deep end and you are never left doing the same thing long enough to stop responding.',
      },
      {
        title: 'Habit Building & Accountability',
        description:
          "Consistency is the most important factor in your results — especially in the beginning. Your coach builds accountability into your program through regular check-ins, habit support, and the kind of guidance that keeps you showing up even when motivation isn't at its peak. The habit is built here. The results follow.",
      },
    ],
    fitFor: [
      'You are new to structured training and want expert guidance from the start rather than figure it out alone and waste potentially years without professional coaching',
      'The gym feels unfamiliar or intimidating and you want a coach who will make the process approachable and clear',
      'You want to build a foundation of good movement habits and sustainable training from the very beginning and avoid injuries',
      'You are ready to be consistent and commit to the process, even if you are starting from zero',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
  },
  busy: {
    id: 'busy',
    name: "I'm Too Busy",
    tagline: 'Maximum ROI for Your Time.',
    description: 'IFBB Pro Coach',
    category: 'wellness',
    pricing: [
      {
        period: 'monthly',
        price: '$179',
        suffix: '/month',
        note: '2 month minimum',
        amount: 179,
        currency: 'USD',
      },
      {
        period: 'six-months',
        price: '$979',
        suffix: 'one-time',
        amount: 979,
        currency: 'USD',
      },
      {
        period: 'twelve-months',
        price: '$1,799',
        suffix: 'one-time',
        amount: 1799,
        currency: 'USD',
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
    lead: "Not having enough time is the most common reason women don't train consistently — and the least valid one. Three to four hours per week is enough to change your body when those hours are programmed with intention and coached by someone who knows what they're doing. And if getting to a gym isn't realistic for your schedule or your lifestyle, that's not a problem either — this program is built to work from home.\n\nI'm Too Busy is for the woman whose schedule is full, whose gym access is limited or non-existent, and whose results need to be real. Your coach designs home-based workouts that maximize your training stimulus without requiring a gym membership or expensive equipment. Nutrition strategies are practical and flexible — built around your life, not an idealized version of it.\n\nYou don't need more time. You don't need a gym. You need a better plan.",
    detailedFeatures: [
      {
        title: 'Home-Based Training Programming',
        description:
          'Your program is designed for home training from the ground up — not a gym program with modifications bolted on. Using bodyweight, resistance bands, dumbbells, or whatever equipment you have available, your coach builds sessions that are efficient, effective, and progressively challenging. Three to four targeted sessions per week, each structured to deliver real results in the time you have.',
      },
      {
        title: 'Flexible Nutrition Strategies',
        description:
          "Rigid meal plans don't survive contact with a busy life. Your coach builds a flexible nutrition approach around your schedule, your food preferences, and your real-world constraints — giving you the framework to make good decisions whether you are eating at home, at your desk, or on the go. Practical, sustainable, and results-driven.",
      },
      {
        title: 'Travel & Schedule Adaptation',
        description:
          "Your program doesn't stop when your schedule gets complicated. Workout alternatives that require zero equipment, minimal space, and no gym access are built into your plan from the start so that a busy week or a change in routine is a minor inconvenience, not a derailment. Your coach adjusts your plan around your life, not the other way around.",
      },
      {
        title: 'Weekly Check-Ins & Accountability',
        description:
          "Consistency is built through accountability. Weekly check-ins keep your coach informed about what's working, what isn't, and what needs to change — and keep you honest about whether you are showing up for the sessions that matter. Your coach is in your corner every week, not just when it's convenient.",
      },
    ],
    fitFor: [
      'You have a demanding schedule and have struggled to maintain consistency with training in the past',
      'You prefer to train at home and want a program that is designed for home-based training — not a gym program adapted as an afterthought',
      'You want results but cannot commit to long training sessions or rigid meal plans',
      'You travel regularly or have a schedule that changes week to week and need a program that adapts with you',
      'You are ready to maximize the time you do have with a program built for efficiency without sacrificing results',
    ],
    faq: [
      {
        question: 'Placeholder question 1.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 2.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
      {
        question: 'Placeholder question 3.',
        answer:
          'Placeholder answer. The real copy is owner-written and replaces this stub before launch; the page renders so coaches can review the layout first.',
      },
    ],
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
 * Launch-gate predicate for the `/services/[slug]` detail-page route.
 *
 * A service ships a detail page only when it carries enough qualifying
 * content for the page to be useful: a lead paragraph plus arity-thresholded
 * arrays for the four data-driven sections. The thresholds come from the
 * requirements doc and are the single source of truth for both
 * `getStaticPaths` (filters which services emit a detail path) and
 * `ServiceCard` (decides whether the card's CTA points at the detail page or
 * the contact route). Defining them in two places would let the two
 * consumers drift.
 *
 * Thresholds:
 * - `lead` — non-empty string
 * - `detailedFeatures` — at least 3 entries
 * - `fitFor` — at least 3 entries
 * - `faq` — at least 3 entries
 * - `pricing` — at least 1 entry (the hero's starting-from chip and the
 *   structured-data offer derive from this; an empty pricing array would
 *   leave the page without a ship-able CTA surface)
 *
 * Acts as a TypeScript type guard: passing services narrow to
 * {@link ServiceWithCompleteDetailContent}, so downstream consumers see
 * `lead`, `detailedFeatures`, `fitFor`, and `faq` as required.
 *
 * Naming follows the `hasDetailPage` (success-stories) precedent — same
 * `has*` type-guard prefix, distinct body because the services predicate
 * checks five field-arity thresholds rather than the slug/age/detail triple.
 */
function hasCompleteDetailContent(service: Service): service is ServiceWithCompleteDetailContent {
  return (
    typeof service.lead === 'string' &&
    service.lead.length > 0 &&
    (service.detailedFeatures?.length ?? 0) >= 3 &&
    (service.fitFor?.length ?? 0) >= 3 &&
    (service.faq?.length ?? 0) >= 3 &&
    service.pricing.length >= 1
  );
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
  highlightedServiceIds: ['competition-prep', 'performance-ready', 'get-jacked'],
  allServicesLink: {
    label: 'Browse All Services',
    href: routes.services,
  },
} as const;

// Export
export {
  billingPeriods,
  categories,
  categoriesById,
  categoryIds,
  defaultPeriod,
  getServiceById,
  getServicesByCategory,
  getServicesByIds,
  hasCompleteDetailContent,
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
  ServiceWithCompleteDetailContent,
};
