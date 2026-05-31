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
   * bare session `?service=posing` landings (no configurator triple), and
   * quiz-only landings. Sister field to {@link headlineTransactional} and
   * {@link headlineProgram}; the contact-form controller toggles between the
   * three `<span data-contact-headline-mode>` variants inside the rendered
   * heading element.
   */
  headlineConversational: string;
  /**
   * Transactional headline rendered after a Configurator deep-link
   * (`?service=&duration=&package=`) resolves and the controller swaps
   * the visible variant. Sister field to {@link headlineConversational}.
   */
  headlineTransactional: string;
  /**
   * Program headline rendered after a subscription `?service=<id>` deep-link
   * resolves (`pricingModel === 'subscription'`) and the controller swaps
   * the visible variant. Service-generic — the subscription context box
   * carries the service name, so the headline does not repeat it. Sister
   * field to {@link headlineConversational}.
   */
  headlineProgram: string;
  /**
   * Static label rendered on the locked service line shown after a
   * Configurator deep-link. The service display name is appended by the
   * controller at runtime; this field carries the label literal (e.g.
   * `'Service:'`).
   */
  lockedServiceLabel: string;
  /**
   * Uppercase label rendered above the subscription context box body (e.g.
   * `'Your selected program'`). Passed to both the box and the shared
   * `ContextBoxShell`.
   */
  subscriptionBoxHeading: string;
  /**
   * Link text for the subscription box's conditional program-details link
   * (e.g. `'See full program details'`). The `↗` glyph is appended in the
   * component template.
   */
  subscriptionBoxDetailLabel: string;
  /**
   * Link text for the always-shown "ask about a different service" link in
   * the context-box shell, shared by the configurator and subscription
   * boxes (e.g. `'Ask about a different service'`). The `↗` glyph is
   * appended in the component template.
   */
  subscriptionBoxDifferentServiceLabel: string;
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
  headlineProgram: "Let's talk about your program",
  lockedServiceLabel: 'Service:',
  subscriptionBoxHeading: 'Your selected program',
  subscriptionBoxDetailLabel: 'See full program details',
  subscriptionBoxDifferentServiceLabel: 'Ask about a different service',
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
