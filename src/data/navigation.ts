type NavItem = {
  /** Display text shown in the navigation */
  label: string;
  /** URL path or external link */
  href: string;
};

/** Footer link (flat list, no groups) */
type FooterLink = NavItem;

type NavigationConfig = {
  /** Primary navigation items displayed in the header */
  main: readonly NavItem[];
  /** Footer navigation links (flat list: main nav + legal) */
  footer: readonly FooterLink[];
};

const navigationConfig = {
  main: [
    { label: 'Services', href: '/services' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Success Stories', href: '/success-stories' },
    { label: 'Coaches', href: '/coaches' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Success Stories', href: '/success-stories' },
    { label: 'Coaches', href: '/coaches' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
} as const satisfies NavigationConfig;

// Export
export { navigationConfig };
export type { NavItem, FooterLink };
