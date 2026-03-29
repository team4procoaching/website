/**
 * Call-to-action configuration for the final page CTA.
 */

import { routes } from './routes';

type CtaConfig = {
  /** CTA headline */
  headline: string;
  /** Description text */
  description: string;
  /** Primary CTA button */
  primaryCta: {
    label: string;
    href: string;
  };
  /** Optional secondary link */
  secondaryCta?: {
    label: string;
    href: string;
  };
};

const finalCta = {
  headline: 'Ready to Transform Your Life?',
  description:
    "Take the first step toward the body and confidence you deserve. Whether you're just starting out or preparing for competition, we're here to guide you every step of the way.",
  primaryCta: {
    label: 'Start Your Journey',
    href: routes.contact,
  },
  secondaryCta: {
    label: 'Explore Services',
    href: routes.services,
  },
} as const satisfies CtaConfig;

export { finalCta };
export type { CtaConfig };
