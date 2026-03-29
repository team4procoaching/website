/**
 * Quiz data and configuration.
 * Used by QuizModal.astro to guide users to the right service.
 *
 * Flow: Step 1 (goal/category) → Step 2 (specific service) → Step 3 (experience)
 *       → Step 4 (timeline) → Result (recommendation + contact link)
 *
 * Steps 1+2 determine the service recommendation. Steps 3+4 collect context
 * that is passed to the contact form as URL parameters.
 *
 * Type safety guarantees:
 * - step1 has exactly one option per ServiceCategory (Record completeness)
 * - step2 has exactly one QuizStep per ServiceCategory (Record completeness)
 * - results has exactly one QuizResult per step2 option ID (derived union)
 * - Adding a new ServiceCategory or step2 option without updating all three
 *   structures is a compile error.
 */

import { routes } from '~/data/routes';
import { categoryIds, type ServiceCategory } from '~/data/services';

/** Single quiz option */
type QuizOption = {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
};

/** Quiz step configuration */
type QuizStep = {
  /** Step identifier */
  id: string;
  /** Question text */
  question: string;
  /** Available options */
  options: readonly QuizOption[];
};

/** Service recommendation result */
type QuizResult = {
  /** Service name */
  serviceName: string;
  /** Service tagline */
  tagline: string;
  /** Link to service section or page */
  href: string;
};

// ---------------------------------------------------------------------------
// Step 1: Category selection
// ---------------------------------------------------------------------------

/**
 * Step 1 options keyed by ServiceCategory — compile-time completeness guarantee.
 * Adding a new ServiceCategory without a step1 option is a compile error.
 * The mapped type ensures each key's `id` field matches the key itself,
 * preventing accidental mismatches like `bodybuilding: { id: 'athletic' }`.
 */
const step1OptionsById = {
  bodybuilding: {
    id: 'bodybuilding',
    label: 'I want to compete',
    description: 'Step on stage and win competitions',
  },
  athletic: {
    id: 'athletic',
    label: 'I train for my sport',
    description: 'Improve athletic performance',
  },
  wellness: {
    id: 'wellness',
    label: 'I want to transform my body',
    description: 'Build muscle, lose fat, feel amazing',
  },
  mindset: {
    id: 'mindset',
    label: 'I need mental support',
    description: 'Mindset coaching and life balance',
  },
} as const satisfies { [K in ServiceCategory]: QuizOption & { id: K } };

/** Step 1: Main goal / category selection */
const step1 = {
  id: 'goal',
  question: "What's your main goal?",
  options: categoryIds.map((id) => step1OptionsById[id]),
} satisfies QuizStep;

// ---------------------------------------------------------------------------
// Step 2: Category-specific questions
// ---------------------------------------------------------------------------

/**
 * Step 2 questions keyed by ServiceCategory — compile-time completeness guarantee.
 * Uses `satisfies` (not `: Record<>`) to preserve literal option ID types,
 * which are then extracted as {@link Step2OptionId} for the results Record.
 */
const step2 = {
  bodybuilding: {
    id: 'bodybuilding-detail',
    question: 'Where are you in your competition journey?',
    options: [
      {
        id: 'competition-prep',
        label: 'I have a show coming up',
        description: 'Need to peak perfectly and safely',
      },
      {
        id: 'off-season',
        label: "I'm between shows",
        description: 'Building muscle in the off-season',
      },
      {
        id: 'posing',
        label: 'I need to improve my stage presence',
        description: 'Posing and presentation skills',
      },
    ],
  },
  athletic: {
    id: 'athletic-detail',
    question: 'What type of athlete are you?',
    options: [
      {
        id: 'competition-ready',
        label: 'Combat sports or powerlifting',
        description: 'Need to make weight and keep power',
      },
      {
        id: 'level-up',
        label: 'Endurance or martial arts',
        description: 'Want sport-specific training',
      },
    ],
  },
  wellness: {
    id: 'wellness-detail',
    question: 'What best describes your situation?',
    options: [
      {
        id: 'get-jacked',
        label: 'I want serious muscle',
        description: 'Ready to look like I lift',
      },
      {
        id: 'get-lean',
        label: 'I want to get lean',
        description: 'Fat loss and body recomposition',
      },
      {
        id: 'beginner',
        label: "I'm new to fitness",
        description: 'Need guidance to start right',
      },
      {
        id: 'busy',
        label: "I'm too busy",
        description: 'Maximum results, minimum time',
      },
    ],
  },
  mindset: {
    id: 'mindset-detail',
    question: 'What kind of support do you need?',
    options: [
      {
        id: 'life-coaching',
        label: 'Life balance and breakthroughs',
        description: 'Feeling stuck or overwhelmed',
      },
      {
        id: 'champion-mindset',
        label: 'Elite mental tools',
        description: 'Think and perform like a pro',
      },
    ],
  },
} as const satisfies Record<ServiceCategory, QuizStep>;

/**
 * All step 2 option IDs — derived from the step2 data.
 * Adding a new option to step2 without a matching result is a compile error.
 *
 * Known limitation: TypeScript cannot detect duplicate IDs across categories
 * at compile time (the union silently deduplicates). A unit test guards against
 * this — see src/data/quiz.test.ts.
 */
type Step2OptionId = (typeof step2)[ServiceCategory]['options'][number]['id'];

// ---------------------------------------------------------------------------
// Step 3: Experience level (context-only, does not affect recommendation)
// ---------------------------------------------------------------------------

const step3 = {
  id: 'experience',
  question: 'How would you describe your training experience?',
  options: [
    {
      id: 'beginner',
      label: "I'm just starting out",
      description: 'Less than 1 year of consistent training',
    },
    {
      id: 'intermediate',
      label: "I've been at it for a while",
      description: '1–3 years of consistent training',
    },
    {
      id: 'advanced',
      label: "I'm experienced",
      description: '3+ years, ready for the next level',
    },
  ],
} as const satisfies QuizStep;

// ---------------------------------------------------------------------------
// Step 4: Timeline (context-only, does not affect recommendation)
// ---------------------------------------------------------------------------

const step4 = {
  id: 'timeline',
  question: "What's your timeline?",
  options: [
    {
      id: 'urgent',
      label: 'I have a deadline coming up',
      description: 'Show, event, or goal in the next 8 weeks',
    },
    {
      id: 'soon',
      label: 'I want to start this month',
      description: 'Ready to commit and see results',
    },
    {
      id: 'flexible',
      label: 'No rush, long-term focus',
      description: 'Building sustainable habits over time',
    },
  ],
} as const satisfies QuizStep;

// ---------------------------------------------------------------------------
// Step labels for the progress indicator
// ---------------------------------------------------------------------------

const stepLabels = [
  { label: 'Your Goal', shortLabel: 'Goal' },
  { label: 'Your Situation', shortLabel: 'Details' },
  { label: 'Experience', shortLabel: 'Experience' },
  { label: 'Timeline', shortLabel: 'Timeline' },
] as const;

// ---------------------------------------------------------------------------
// Results: Service recommendations
// ---------------------------------------------------------------------------

/**
 * Service recommendations keyed by Step2OptionId — compile-time completeness guarantee.
 * Every step2 option must have a corresponding result entry.
 */
const results = {
  // Bodybuilding
  'competition-prep': {
    serviceName: 'Competition Prep',
    tagline: 'Peaking Perfectly, Safely, and Victoriously.',
    href: `${routes.services}?category=bodybuilding&service=competition-prep`,
  },
  'off-season': {
    serviceName: 'Off-Season Muscle Building',
    tagline: 'Grow with Purpose.',
    href: `${routes.services}?category=bodybuilding&service=off-season`,
  },
  posing: {
    serviceName: 'Posing & Stage Presence',
    tagline: 'Own the Stage.',
    href: `${routes.services}?category=bodybuilding&service=posing`,
  },
  // Athletic
  'competition-ready': {
    serviceName: 'Competition Ready',
    tagline: 'Make Weight. Keep Power.',
    href: `${routes.services}?category=athletic&service=competition-ready`,
  },
  'level-up': {
    serviceName: 'Level Up',
    tagline: 'Built for Your Sport.',
    href: `${routes.services}?category=athletic&service=level-up`,
  },
  // Wellness
  'get-jacked': {
    serviceName: 'Get Jacked',
    tagline: 'Look Like You Lift.',
    href: `${routes.services}?category=wellness&service=get-jacked`,
  },
  'get-lean': {
    serviceName: 'Get Lean',
    tagline: 'Reveal Your Best Self.',
    href: `${routes.services}?category=wellness&service=get-lean`,
  },
  beginner: {
    serviceName: "I'm New to This",
    tagline: 'Start Strong, Start Right.',
    href: `${routes.services}?category=wellness&service=beginner`,
  },
  busy: {
    serviceName: "I'm Too Busy",
    tagline: 'Maximum ROI for Your Time.',
    href: `${routes.services}?category=wellness&service=busy`,
  },
  // Mindset
  'life-coaching': {
    serviceName: 'Life Coaching',
    tagline: 'Balance and Breakthroughs.',
    href: `${routes.services}?category=mindset&service=life-coaching`,
  },
  'champion-mindset': {
    serviceName: 'Champion Mindset',
    tagline: 'Think Like a Pro.',
    href: `${routes.services}?category=mindset&service=champion-mindset`,
  },
} as const satisfies Record<Step2OptionId, QuizResult>;

/**
 * Shape of the JSON-serialized quiz data passed to the client via
 * `<template data-json>`. Used by QuizModal's frontmatter (serializer)
 * and quizModalController.ts (consumer) — single source of truth.
 */
type SerializedQuizData = {
  step1: QuizStep;
  step2: Record<string, QuizStep>;
  step3: QuizStep;
  step4: QuizStep;
  stepLabels: readonly { label: string; shortLabel: string }[];
  results: Record<string, QuizResult>;
  contactRoute: string;
};

export { step1, step2, step3, step4, stepLabels, results };
export type { QuizOption, QuizStep, QuizResult, Step2OptionId, SerializedQuizData };
