/**
 * Thank you page data.
 * Used by pages/contact/thanks.astro.
 */

import { routes } from './routes';

/** Thank you page configuration */
type ThanksPage = {
  /** Page headline */
  headline: string;
  /** Message text */
  message: string;
  /** Icon rendering type */
  iconType: 'fill' | 'stroke';
  /**
   * SVG icon path(s) - will be rendered inside an SVG with viewBox="0 0 24 24"
   * SECURITY: Only use trusted, static icon paths. Never use user input.
   */
  icon: string;
  /** Back button configuration */
  backButton: {
    label: string;
    href: string;
  };
};

const thanksPage: ThanksPage = {
  headline: 'Message Sent!',
  message:
    "Thank you for reaching out. We've received your message and will get back to you as soon as possible — usually within 24-48 hours.",
  iconType: 'stroke',
  // Heroicons: check-circle (outline)
  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
  backButton: {
    label: 'Back to Home',
    href: routes.home,
  },
};

// Export
export { thanksPage };
export type { ThanksPage };
