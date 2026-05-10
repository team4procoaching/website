import { routes } from './routes';

type NavItem = {
  /** Display text shown in the navigation */
  label: string;
  /** URL path or external link */
  href: string;
};

type NavigationConfig = {
  /** Primary navigation items displayed in the header */
  main: readonly NavItem[];
  /** Footer navigation links (flat list: main nav + legal) */
  footer: readonly NavItem[];
};

const navigationConfig = {
  main: [
    { label: 'Home', href: routes.home },
    { label: 'Services', href: routes.services },
    { label: 'How It Works', href: routes.howItWorks },
    { label: 'Success Stories', href: routes.successStories },
    { label: 'Coaches', href: routes.coaches },
    { label: 'Contact', href: routes.contact },
  ],
  footer: [
    { label: 'Home', href: routes.home },
    { label: 'Services', href: routes.services },
    { label: 'How It Works', href: routes.howItWorks },
    { label: 'Success Stories', href: routes.successStories },
    { label: 'Coaches', href: routes.coaches },
    { label: 'Contact', href: routes.contact },
    { label: 'Privacy Policy', href: routes.privacy },
    { label: 'Terms of Service', href: routes.terms },
  ],
} as const satisfies NavigationConfig;

// Export
export { navigationConfig };
export type { NavItem };
