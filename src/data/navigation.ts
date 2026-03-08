export type NavItem = {
  /** Display text shown in the navigation */
  label: string;
  /** URL path or external link */
  href: string;
};

/** Footer link (flat list, no groups) */
export type FooterLink = NavItem;

type NavigationConfig = {
  /** Primary navigation items displayed in the header */
  main: NavItem[];
  /** Footer navigation links (flat list: main nav + legal) */
  footer: readonly FooterLink[];
};

const navigationConfig = {
  main: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Success Stories', href: '/success-stories' },
    { label: 'Coaches', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Success Stories', href: '/success-stories' },
    { label: 'Coaches', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
} as const satisfies NavigationConfig;

export default navigationConfig;
