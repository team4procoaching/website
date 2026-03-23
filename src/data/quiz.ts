/**
 * Quiz data and configuration.
 * Used by QuizModal.astro to guide users to the right service.
 */
import type { ServiceCategory } from '~/data/services';

/** Single quiz option */
export type QuizOption = {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
};

/** Quiz step configuration */
export type QuizStep = {
  /** Step identifier */
  id: string;
  /** Question text */
  question: string;
  /** Available options */
  options: readonly QuizOption[];
};

/** Service recommendation result */
export type QuizResult = {
  /** Service name */
  serviceName: string;
  /** Service tagline */
  tagline: string;
  /** Link to service section or page */
  href: string;
};

/** Step 1: Main goal / category selection */
const step1: QuizStep = {
  id: 'goal',
  question: "What's your main goal?",
  options: [
    {
      id: 'bodybuilding',
      label: 'I want to compete',
      description: 'Step on stage and win competitions',
    },
    {
      id: 'athletic',
      label: 'I train for my sport',
      description: 'Improve athletic performance',
    },
    {
      id: 'wellness',
      label: 'I want to transform my body',
      description: 'Build muscle, lose fat, feel amazing',
    },
    {
      id: 'mindset',
      label: 'I need mental support',
      description: 'Mindset coaching and life balance',
    },
  ],
} as const;

/** Step 2: Category-specific questions — keyed by ServiceCategory for completeness */
const step2: Record<ServiceCategory, QuizStep> = {
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
} as const;

/** Service recommendations mapped by option ID */
const results: Record<string, QuizResult> = {
  // Bodybuilding
  'competition-prep': {
    serviceName: 'Competition Prep',
    tagline: 'Peaking Perfectly, Safely, and Victoriously.',
    href: '/services#competition-prep',
  },
  'off-season': {
    serviceName: 'Off-Season Muscle Building',
    tagline: 'Grow with Purpose.',
    href: '/services#off-season',
  },
  posing: {
    serviceName: 'Posing & Stage Presence',
    tagline: 'Own the Stage.',
    href: '/services#posing',
  },
  // Athletic
  'competition-ready': {
    serviceName: 'Competition Ready',
    tagline: 'Make Weight. Keep Power.',
    href: '/services#competition-ready',
  },
  'level-up': {
    serviceName: 'Level Up',
    tagline: 'Built for Your Sport.',
    href: '/services#level-up',
  },
  // Wellness
  'get-jacked': {
    serviceName: 'Get Jacked',
    tagline: 'Look Like You Lift.',
    href: '/services#get-jacked',
  },
  'get-lean': {
    serviceName: 'Get Lean',
    tagline: 'Reveal Your Best Self.',
    href: '/services#get-lean',
  },
  beginner: {
    serviceName: "I'm New to This",
    tagline: 'Start Strong, Start Right.',
    href: '/services#beginner',
  },
  busy: {
    serviceName: "I'm Too Busy",
    tagline: 'Maximum ROI for Your Time.',
    href: '/services#busy',
  },
  // Mindset
  'life-coaching': {
    serviceName: 'Life Coaching',
    tagline: 'Balance and Breakthroughs.',
    href: '/services#life-coaching',
  },
  'champion-mindset': {
    serviceName: 'Champion Mindset',
    tagline: 'Think Like a Pro.',
    href: '/services#champion-mindset',
  },
} as const;

export { step1, step2, results };
