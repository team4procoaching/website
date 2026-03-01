/**
 * Services data and configuration.
 * Used by Services.astro, ServiceCategoryTabs, and individual service pages.
 */

/** Service category identifiers */
type ServiceCategory = 'bodybuilding' | 'athletic' | 'wellness' | 'mindset';

/** Category metadata */
type CategoryInfo = {
  /** Category identifier */
  id: ServiceCategory;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
};

/** All service categories */
const categories: readonly CategoryInfo[] = [
  {
    id: 'bodybuilding',
    name: 'Bodybuilding',
    description: 'Competition prep, off-season building, and posing mastery.',
  },
  {
    id: 'athletic',
    name: 'Athletic',
    description: 'Sport-specific training for competitive athletes.',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    description: 'Lifestyle transformation and sustainable fitness.',
  },
  {
    id: 'mindset',
    name: 'Mindset',
    description: 'Mental coaching and life balance.',
  },
] as const;

/** Available billing periods - single source of truth */
const billingPeriods = [
  { value: 'standard', label: 'Standard' },
  { value: 'sixmonths', label: '6 Months' },
  { value: 'twelvemonths', label: '12 Months' },
] as const;

/** Billing period value type derived from billingPeriods */
type BillingPeriod = (typeof billingPeriods)[number]['value'];

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
};

/** Service/program configuration */
type Service = {
  /** Unique identifier (used for URLs and IDs) */
  id: string;
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
  /** List of included features */
  features: readonly string[];
  /** CTA link */
  href: string;
  /** Whether this service is featured/highlighted */
  featured?: boolean;
};

/** All available services organized by category */
const services: readonly Service[] = [
  // ============================================
  // BODYBUILDING
  // ============================================
  {
    id: 'competition-prep',
    name: 'Competition Prep',
    tagline: 'Peaking Perfectly, Safely, and Victoriously.',
    description:
      'Elite preparation for bikini, figure, or wellness competitors. Peak week expertise included.',
    category: 'bodybuilding',
    pricing: [
      { period: 'standard', price: '€299', suffix: '/month', note: '3 month minimum' },
      { period: 'sixmonths', price: '€1,599', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€2,899', suffix: 'one-time' },
    ],
    features: [
      'Contest-specific periodization',
      'Peak week protocol',
      'Posing coaching sessions',
      'Weekly check-ins during prep',
      'Competition day support',
      'Post-show reverse diet plan',
    ],
    href: '/contact?service=competition-prep',
    featured: true,
  },
  {
    id: 'off-season',
    name: 'Off-Season Muscle Building',
    tagline: 'Grow with Purpose.',
    description:
      'Strategic muscle building between shows. Maximize your improvements while staying stage-ready.',
    category: 'bodybuilding',
    pricing: [
      { period: 'standard', price: '€249', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,349', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€2,499', suffix: 'one-time' },
    ],
    features: [
      'Hypertrophy-focused programming',
      'Strategic caloric surplus planning',
      'Weak point analysis & improvement',
      'Bi-weekly progress assessments',
      'Supplement guidance',
    ],
    href: '/contact?service=off-season',
  },
  {
    id: 'posing',
    name: 'Posing & Stage Presence',
    tagline: 'Own the Stage.',
    description:
      'Master your presentation. Posing can make or break your placement—learn from champions.',
    category: 'bodybuilding',
    pricing: [
      { period: 'standard', price: '€149', suffix: '/session' },
      { period: 'sixmonths', price: '€799', suffix: '6 sessions' },
      { period: 'twelvemonths', price: '€1,399', suffix: '12 sessions' },
    ],
    features: [
      'Division-specific posing',
      'Video analysis & feedback',
      'Stage presence coaching',
      'Competition walk-through',
      'Confidence building techniques',
    ],
    href: '/contact?service=posing',
  },

  // ============================================
  // ATHLETIC
  // ============================================
  {
    id: 'competition-ready',
    name: 'Competition Ready',
    tagline: 'Make Weight. Keep Power.',
    description:
      'For combat sports and powerlifting athletes who need to peak for competition day.',
    category: 'athletic',
    pricing: [
      { period: 'standard', price: '€249', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,349', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€2,499', suffix: 'one-time' },
    ],
    features: [
      'Weight cut protocols',
      'Strength peaking program',
      'Competition day nutrition',
      'Recovery optimization',
      'Sport-specific conditioning',
    ],
    href: '/contact?service=competition-ready',
    featured: true,
  },
  {
    id: 'level-up',
    name: 'Level Up',
    tagline: 'Built for Your Sport.',
    description:
      'Sport-specific training for endurance athletes, martial artists, and team sport players.',
    category: 'athletic',
    pricing: [
      { period: 'standard', price: '€199', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,099', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,999', suffix: 'one-time' },
    ],
    features: [
      'Sport-specific programming',
      'Performance periodization',
      'Injury prevention protocols',
      'Energy system development',
      'Competition scheduling',
    ],
    href: '/contact?service=level-up',
  },

  // ============================================
  // WELLNESS
  // ============================================
  {
    id: 'get-jacked',
    name: 'Get Jacked',
    tagline: 'Look Like You Lift.',
    description: 'Serious muscle building for women who want to stand out. No fluff, just results.',
    category: 'wellness',
    pricing: [
      { period: 'standard', price: '€199', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,099', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,999', suffix: 'one-time' },
    ],
    features: [
      'Progressive overload programming',
      'Muscle-building nutrition plan',
      'Form coaching & video reviews',
      'Bi-weekly check-ins',
      'Supplement recommendations',
    ],
    href: '/contact?service=get-jacked',
    featured: true,
  },
  {
    id: 'get-lean',
    name: 'Get Lean',
    tagline: 'Reveal Your Best Self.',
    description:
      'Strategic fat loss while preserving muscle. Sustainable approach, no crash diets.',
    category: 'wellness',
    pricing: [
      { period: 'standard', price: '€199', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,099', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,999', suffix: 'one-time' },
    ],
    features: [
      'Personalized caloric deficit',
      'Flexible dieting approach',
      'Metabolic adaptation management',
      'Weekly accountability check-ins',
      'Reverse diet exit strategy',
    ],
    href: '/contact?service=get-lean',
  },
  {
    id: 'beginner',
    name: "I'm New to This",
    tagline: 'Start Strong, Start Right.',
    description:
      'Perfect for women starting their fitness journey. Build a strong foundation with expert guidance.',
    category: 'wellness',
    pricing: [
      { period: 'standard', price: '€149', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€799', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,399', suffix: 'one-time' },
    ],
    features: [
      'Fundamentals-focused training',
      'Nutrition basics education',
      'Weekly form video reviews',
      'Habit building support',
      'Private community access',
    ],
    href: '/contact?service=beginner',
  },
  {
    id: 'busy',
    name: "I'm Too Busy",
    tagline: 'Maximum ROI for Your Time.',
    description: 'Efficient training for busy professionals. Get results with 3-4 hours per week.',
    category: 'wellness',
    pricing: [
      { period: 'standard', price: '€179', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€979', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,799', suffix: 'one-time' },
    ],
    features: [
      'Time-efficient workouts (45-60 min)',
      'Flexible scheduling options',
      'Quick meal prep strategies',
      'Travel workout alternatives',
      'Stress management integration',
    ],
    href: '/contact?service=busy',
  },

  // ============================================
  // MINDSET
  // ============================================
  {
    id: 'life-coaching',
    name: 'Life Coaching',
    tagline: 'Balance and Breakthroughs.',
    description:
      'Holistic coaching for women feeling stuck or overwhelmed. Find balance and breakthrough barriers.',
    category: 'mindset',
    pricing: [
      { period: 'standard', price: '€199', suffix: '/month', note: '3 month minimum' },
      { period: 'sixmonths', price: '€1,099', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,999', suffix: 'one-time' },
    ],
    features: [
      'Weekly 1:1 coaching calls',
      'Goal setting & accountability',
      'Stress & anxiety management',
      'Work-life balance strategies',
      'Personal growth roadmap',
    ],
    href: '/contact?service=life-coaching',
  },
  {
    id: 'champion-mindset',
    name: 'Champion Mindset',
    tagline: 'Think Like a Pro.',
    description:
      'Elite mental performance tools used by champions. Develop unshakeable confidence.',
    category: 'mindset',
    pricing: [
      { period: 'standard', price: '€249', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,349', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€2,499', suffix: 'one-time' },
    ],
    features: [
      'Competition mental prep',
      'Visualization techniques',
      'Pre-performance routines',
      'Pressure management',
      'Confidence building protocols',
    ],
    href: '/contact?service=champion-mindset',
  },
] as const;

/**
 * Get services filtered by category.
 */
function getServicesByCategory(category: ServiceCategory): readonly Service[] {
  return services.filter((service) => service.category === category);
}

/**
 * Get a single service by ID.
 */
function getServiceById(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}

/**
 * Get featured services (one per category for homepage).
 */
function getFeaturedServices(): readonly Service[] {
  return services.filter((service) => service.featured);
}

/** Services section configuration (for homepage) */
type ServicesSection = {
  /** Section headline */
  headline: string;
  /** Intro text below headline */
  intro: string;
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
  allServicesLink: {
    label: 'Browse All Services',
    href: '/services',
  },
} as const;

// Export
export {
  billingPeriods,
  categories,
  services,
  servicesSection,
  getServicesByCategory,
  getServiceById,
  getFeaturedServices,
};
export type {
  BillingPeriod,
  CategoryInfo,
  PricingOption,
  Service,
  ServiceCategory,
  ServicesSection,
};
