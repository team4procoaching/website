export type NavItem = {
  /** Display text shown in the navigation */
  label: string;
  /** URL path or external link */
  href: string;
};

/** Footer link group */
export type FooterLinkGroup = {
  /** Group heading */
  title: string;
  /** Links in this group */
  links: readonly NavItem[];
};

type NavigationConfig = {
  /** Primary navigation items displayed in the header */
  main: NavItem[];
  /** Footer navigation link groups */
  footer: readonly FooterLinkGroup[];
};

const navigationConfig = {
  main: [
    { label: 'Home', href: '/' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: [
    {
      title: 'Services',
      links: [
        { label: 'Beginner Program', href: '/services#beginner' },
        { label: 'Competition Prep', href: '/services#competition-prep' },
        { label: 'Lifestyle Transformation', href: '/services#lifestyle' },
        { label: 'Take the Quiz', href: '/quiz' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Meet the Coaches', href: '/coaches' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ],
} as const satisfies NavigationConfig;

export default navigationConfig;
