/** Logo configuration for light/dark mode */
export type LogoConfig = {
  /** Logo for light backgrounds */
  light: string;
  /** Logo for dark backgrounds */
  dark: string;
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
};

const siteConfig = {
  name: 'Team 4 Pro Coaching',
  title: 'Coaching for women by women',
  description:
    'Achieve extraordinary results with IFBB Pro female coaches. Expert coaching for muscle building, competition prep, and lifestyle transformation. Start today!',
  logo: {
    light: 'https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600',
    dark: 'https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500',
  },
} as const satisfies SiteConfig;

export default siteConfig;
