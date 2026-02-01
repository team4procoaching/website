/**
 * Services data and configuration.
 * Used by Services.astro and potentially individual service pages.
 */

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
  /** Short description */
  description: string;
  /** Pricing for each billing period */
  pricing: readonly PricingOption[];
  /** List of included features */
  features: readonly string[];
  /** CTA link */
  href: string;
  /** Whether this service is featured/highlighted */
  featured?: boolean;
};

/** All available services */
const services = [
  {
    id: 'beginner',
    name: 'Beginner Program',
    description:
      'Perfect for women starting their fitness journey. Build a strong foundation with expert guidance.',
    pricing: [
      { period: 'standard', price: '€149', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€799', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,399', suffix: 'one-time' },
    ],
    features: [
      'Personalized training plan',
      'Nutrition fundamentals guide',
      'Weekly check-ins',
      'Form video reviews',
      'Private community access',
    ],
    href: '#contact',
  },
  {
    id: 'competition-prep',
    name: 'Competition Prep',
    description:
      'Elite preparation for bikini, figure, or wellness competitors. Peak week expertise included.',
    pricing: [
      { period: 'standard', price: '€299', suffix: '/month', note: '2 month minimum' },
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
    href: '#contact',
    featured: true,
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle Transformation',
    description:
      'Sustainable approach for busy women who want lasting results without extreme measures.',
    pricing: [
      { period: 'standard', price: '€199', suffix: '/month', note: '2 month minimum' },
      { period: 'sixmonths', price: '€1,099', suffix: 'one-time' },
      { period: 'twelvemonths', price: '€1,999', suffix: 'one-time' },
    ],
    features: [
      'Flexible macro coaching',
      'Habit-based approach',
      'Bi-weekly video calls',
      'Mindset & motivation support',
      'Travel & dining strategies',
    ],
    href: '#contact',
  },
] as const satisfies readonly Service[];

/** Services section configuration */
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

const servicesSection = {
  headline: 'Our Most Popular Services',
  intro:
    'Choose the program that fits your goals. All packages include direct access to your IFBB Pro coach and our private community.',
  allServicesLink: {
    label: 'Browse All Services',
    href: '/services',
  },
} as const satisfies ServicesSection;

// Export only what's needed externally
export { billingPeriods, services, servicesSection };
export type { BillingPeriod, PricingOption, Service, ServicesSection };
