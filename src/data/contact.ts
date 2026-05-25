/**
 * Contact page data.
 * Used by Contact.astro section.
 */

import { instagramIcon } from './icons';
import { routes } from './routes';

/** Contact method (email, social, etc.) */
type ContactMethod = {
  /** Label for screen readers */
  srLabel: string;
  /** Display text or link text */
  label: string;
  /** URL (mailto:, https://, etc.) */
  href: string;
  /** Icon rendering type */
  iconType: 'fill' | 'stroke';
  /**
   * SVG icon path(s) - will be rendered inside an SVG with viewBox="0 0 24 24"
   * SECURITY: Only use trusted, static icon paths. Never use user input.
   */
  icon: string;
};

/** Contact section configuration */
type ContactSection = {
  /**
   * Default conversational headline rendered for bare `/contact` visits,
   * subscription `?service=<id>` deep-links, and quiz-only landings.
   * Sister field to {@link headlineTransactional}; the contact-form
   * controller toggles between the two `<span data-contact-headline-mode>`
   * variants inside the rendered heading element.
   */
  headlineConversational: string;
  /**
   * Transactional headline rendered after a Configurator deep-link
   * (`?service=&duration=&package=`) resolves and the controller swaps
   * the visible variant. Sister field to {@link headlineConversational}.
   */
  headlineTransactional: string;
  /**
   * Static label rendered on the locked service line shown after a
   * Configurator deep-link. The service display name is appended by the
   * controller at runtime; this field carries the label literal (e.g.
   * `'Service:'`).
   */
  lockedServiceLabel: string;
  /** Intro text below headline */
  intro: string;
  /** Contact methods to display */
  contactMethods: readonly ContactMethod[];
  /** Form configuration */
  form: {
    /** Netlify form name */
    name: string;
    /** Submit button label */
    submitLabel: string;
    /** Success redirect path after form submission */
    successRedirect: string;
  };
};

const contactSection = {
  headlineConversational: 'Tell us about your goals',
  headlineTransactional: 'Confirm your booking request',
  lockedServiceLabel: 'Service:',
  intro:
    "Ready to start your transformation journey? We'd love to hear from you. Send us a message or connect with us on Instagram.",
  contactMethods: [
    {
      srLabel: 'Instagram',
      label: '@team4procoaching',
      href: 'https://www.instagram.com/team4procoaching',
      iconType: 'fill',
      icon: instagramIcon,
    },
  ],
  form: {
    name: 'contact',
    submitLabel: 'Send My Message',
    successRedirect: routes.contactThanks,
  },
} as const satisfies ContactSection;

// Export
export { contactSection };
export type { ContactMethod, ContactSection };
