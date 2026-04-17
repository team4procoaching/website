# Filterable Catalog Pages: Server Renders Full List, Client Filters

Date: 2026-04-16

## Status

Accepted

## Context

The Services page redesign (April 2026) introduces category filtering: users see
all services by default, and can narrow the view with category filter buttons.
URL parameters and hashes support deep-links from the Quiz (`?service=get-lean`)
and external sources (`?category=wellness`).

The question: how should the server respond to a deep-link URL? Two approaches
are possible:

1. **Server-side filtering** — read URL parameters during the Astro build or SSR
   request, emit HTML with only the matching services visible. `display: none`
   (or omission) for non-matching groups.
2. **Client-side filtering** — server always renders the full list (all services
   visible). A client-side controller reads URL parameters after hydration and
   hides non-matching groups.

The project has previously used client-side filtering in `ServiceCategoryTabs`,
but without an explicit rationale documented. This ADR makes the reasoning
explicit and generalizes it for future filterable surfaces.

### Decision drivers

- SEO: search engines should index all services on the Services page, regardless
  of how a crawler arrives (with or without URL parameters)
- Static generation compatibility: the Services page is pre-rendered at build
  time per [ADR-0022](0022-hybrid-rendering-model.md); request-time URL
  inspection is not available without moving to SSR
- Progressive enhancement: users without JavaScript still see all services, even
  if filter interaction is unavailable
- Share/bookmark compatibility: URL state must survive navigation and be
  restorable on page load

### Evaluated approaches

1. **Server-side filtering via SSR** — rejected. Requires making the Services
   page SSR (against ADR-0022 hybrid rendering default for content pages). A
   crawler hitting `?category=wellness` would see only three services,
   potentially affecting indexing of the full catalog under the canonical URL.
2. **Server-side filtering via multiple static routes** — rejected. Generating
   `/services`, `/services/bodybuilding`, `/services/athletic`,
   `/services/wellness` as separate pages at build time is possible, but creates
   URL fragmentation, duplicate content concerns, and does not compose with the
   deep-link patterns used by the Quiz (`?service=X`).
3. **Client-side filtering, server renders full list. Chosen.**

## Decision

For filterable catalog pages (currently Services, potentially Success Stories
and Coaches in the future):

- **Server-render state is always the full list.** No URL parameter inspection
  at build time. Every static HTML artifact contains every item in the catalog.
- **Client-side controller handles deep-links** after hydration. The controller
  reads `window.location.search` and `window.location.hash` on `astro:page-load`
  and applies filter state via CSS class toggling.
- **Content-flash mitigation** is handled via a small inline script in the
  page's `<head>` that sets `document.documentElement.dataset.initialFilter`
  synchronously, combined with a CSS rule that hides non-matching groups until
  the controller takes over. This is localized to the affected page, not global.

### What does NOT change

- Canonical URLs: `/services` remains the canonical URL for the Services
  catalog. Deep-link variants (`/services?category=wellness`) are navigation
  aids, not separate resources.
- Static generation default: Services page remains statically generated per
  [ADR-0022](0022-hybrid-rendering-model.md).
- Progressive enhancement: without JavaScript, the page shows all services
  without filtering — still fully usable, just without the filter interaction.

### Scope and non-goals

**In scope:**

- Filterable catalog pages where the canonical view is "all items visible"
- Deep-link support via URL parameters and hash fragments that resolve to filter
  state

**Out of scope:**

- Paginated catalogs (not currently relevant; would need separate decision)
- Search functionality with free-text input (would likely use a different
  architecture, possibly SSR or edge rendering)
- Authenticated personalized catalogs (out of scope for this site)

## Consequences

### Positive

- Crawlers see the full catalog on every request, regardless of URL parameters.
  No risk of partial indexing from oddly-parameterized crawler requests.
- Static generation is preserved — builds are fast, deployments are immutable,
  Netlify CDN serves pre-rendered HTML.
- The pattern composes with existing URL-based deep-link flows (Quiz, external
  links) without special cases.
- Progressive enhancement works naturally: no-JS users get the full list, JS
  users get filter interaction on top.

### Negative

- Content flash is possible on deep-link landings (server sends "All",
  controller then hides non-matching groups). Mitigation: inline head-script +
  CSS rule, documented in the Services page implementation.
- The canonical URL (`/services`) serves a superset of what a deep-linked URL
  (`/services?category=wellness`) visually shows. A crawler indexing the
  parameterized variant sees hidden content (initially visible, then hidden by
  CSS after hydration). This is acceptable because we do not encourage crawling
  of parameterized URLs and the canonical URL is always the preferred target.

### Risk mitigation

- The inline head-script is kept minimal (under 200 bytes) and wrapped in a
  `try/catch` to survive edge cases silently. The controller's fallback logic
  handles the post-hydration state regardless of the script's success.
- Any new filterable catalog page follows the same pattern: document the inline
  script, the CSS rule, and the controller's deep-link handling in that page's
  implementation notes.

## Success criteria

- Googlebot indexes all nine services from the Services page (verify via Google
  Search Console URL inspection post-launch)
- No visible content flash on deep-link landings for 90th-percentile devices
  (verify with DevTools CPU throttling on mid-tier mobile profiles)

## References

- [ADR-0022](0022-hybrid-rendering-model.md) — static vs. SSR rendering model
  (this ADR extends the static side)
- [ADR-0024](0024-category-filter-semantics.md) — filter vs. tab semantics (the
  accessibility companion to this SEO decision)
- [ADR-0020](0020-client-side-script-strategy-revised.md) — when `is:inline` is
  justified (used here for the content-flash mitigation)
