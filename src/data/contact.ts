/**
 * Contact page data.
 * Used by Contact.astro section.
 */

import { emailIcon, instagramIcon } from './icons';

/** Contact method (email, social, etc.) */
export type ContactMethod = {
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
export type ContactSection = {
  /** Section headline */
  headline: string;
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
  headline: 'Get in Touch',
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
    {
      srLabel: 'Email',
      label: 'hello@team4pro.com',
      href: 'mailto:hello@team4pro.com',
      iconType: 'stroke',
      icon: emailIcon,
    },
  ],
  form: {
    name: 'contact',
    submitLabel: 'Send Message',
    successRedirect: '/contact/thanks',
  },
} as const satisfies ContactSection;

export { contactSection };
