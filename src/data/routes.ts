/**
 * Central route definitions — single source of truth for all internal URLs.
 *
 * Eliminates string duplication across pages, CTAs, and navigation.
 * When a route changes, only this file needs updating — TypeScript will
 * flag any consumers that reference removed or renamed exports.
 *
 * Page routes are absolute paths. Anchor routes include the `#` prefix
 * and are scoped to a specific page (documented via JSDoc).
 */

// ---------------------------------------------------------------------------
// Page Routes
// ---------------------------------------------------------------------------

/** Main page routes */
const routes = {
  home: '/',
  services: '/services',
  howItWorks: '/how-it-works',
  successStories: '/success-stories',
  coaches: '/coaches',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
} as const;

// ---------------------------------------------------------------------------
// Anchor Routes (on-page sections)
// ---------------------------------------------------------------------------

/** Anchor targets on the homepage */
const homeAnchors = {
  /** Services section on homepage */
  services: '#services',
  /** Contact section on homepage */
  contact: '#contact',
} as const;

/** Anchor targets on the coaches page */
const coachesAnchors = {
  /** Coaches grid section */
  meetTheCoaches: '#meet-the-coaches',
} as const;

/** Anchor targets on the how-it-works page */
const howItWorksAnchors = {
  /** Process steps section */
  steps: '#how-it-works',
} as const;

/** Anchor targets on the services page */
const servicesAnchors = {
  /** Service categories section */
  categories: '#categories',
} as const;

/** Anchor targets on the success stories page */
const successStoriesAnchors = {
  /** Stories grid section */
  stories: '#stories',
} as const;

// Export
export {
  routes,
  homeAnchors,
  coachesAnchors,
  howItWorksAnchors,
  servicesAnchors,
  successStoriesAnchors,
};
