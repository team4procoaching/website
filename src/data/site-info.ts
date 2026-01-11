type SiteInfo = {
  /** Site or brand name, e.g. `"Team 4 Pro Coaching"` */
  name: string;
  /** Default page title when no specific title is provided */
  title: string;
  /** Brief site description for meta tags */
  description: string;
};

const siteInfo: Readonly<SiteInfo> = {
  name: 'Team 4 Pro Coaching',
  title: 'Coaching for women by women',
  description:
    'Achieve extraordinary results with IFBB Pro female coaches. Expert coaching for muscle building, competition prep, and lifestyle transformation. Start today!',
} as const;

export default siteInfo;
