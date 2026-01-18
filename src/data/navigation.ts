export type NavItem = {
  /** Display text shown in the navigation */
  label: string;
  /** URL path or external link */
  href: string;
};

type NavigationConfig = {
  /** Primary navigation items displayed in the header */
  main: NavItem[];
};

const navigationConfig = {
  main: [{ label: 'Home', href: '/' }],
} as const satisfies NavigationConfig;

export default navigationConfig;
