import { instagramIcon, youtubeIcon } from './icons';

/** Logo configuration for light/dark mode */
export type LogoConfig = {
  /** Logo for light backgrounds */
  light: string;
  /** Logo for dark backgrounds */
  dark: string;
};

/** Social media link */
export type SocialLink = {
  /** Platform name (for screen readers) */
  name: string;
  /** URL to social profile */
  href: string;
  /** SVG icon path (viewBox should be "0 0 24 24") */
  icon: string;
};

type SiteConfig = {
  /** Site or brand name, e.g. `"Team 4 Pro Coaching"` */
  name: string;
  /** Default page title when no specific title is provided */
  title: string;
  /** Brief site description for meta tags */
  description: string;
  /** Logo configuration */
  logo: LogoConfig;
  /** Social media links */
  social: readonly SocialLink[];
  /** Copyright text */
  copyright: string;
};

const siteConfig = {
  name: 'Team 4 Pro Coaching',
  title: 'Coaching for women by women',
  description:
    'Achieve extraordinary results with IFBB Pro female coaches. Expert coaching for muscle building, competition prep, and lifestyle transformation. Start today!',
  // TODO: Replace Tailwind placeholder logo with Team 4 Pro branding before go-live
  logo: {
    light: 'https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600',
    dark: 'https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500',
  },
  // SECURITY: icon values are imported from data/icons.ts (trusted static SVG paths).
  // They are rendered via set:html in Footer.astro — never use dynamic/user input here.
  social: [
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/team4procoaching',
      icon: instagramIcon,
    },
    // TODO: Add YouTube channel URL when available
    {
      name: 'YouTube',
      href: '#',
      icon: youtubeIcon,
    },
  ],
  copyright: '© 2026 Team 4 Pro Coaching LLC. All rights reserved.',
} as const satisfies SiteConfig;

export { siteConfig };
