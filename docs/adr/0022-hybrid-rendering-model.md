# Hybrid Rendering: Static Pages with Server-Side Endpoints

Date: 2026-03-30

## Status

Accepted

## Context

The project has been fully statically generated (SSG) since inception. All pages
are pre-rendered at build time, and there is no server-side runtime. This works
well for a marketing-oriented coaching website where content changes happen
through code commits, not real-time CMS updates.

However, the planned Stripe integration requires server-side endpoints for:

- Creating checkout sessions (requires Stripe secret key — cannot be exposed to
  the client)
- Receiving webhooks (Stripe sends POST requests to a server endpoint)
- Validating webhook signatures (requires the webhook signing secret)

These are inherently server-side concerns that cannot be implemented in a
statically generated site.

### Decision drivers

- Maintain static performance for marketing pages (Core Web Vitals)
- Enable secure server-side Stripe secret handling
- Minimize operational complexity for a solo developer
- Preserve existing deployment workflow (Netlify auto-deploys)
- Avoid unnecessary runtime costs (Function invocations)

### Evaluated approaches

1. **Separate backend service** — a standalone Node.js/Express API for Stripe,
   deployed independently. Adds operational complexity (two deployments, CORS,
   separate monitoring). Rejected for a small team.

2. **Netlify Functions (manual)** — write raw Netlify Functions in
   `netlify/functions/`. Works but bypasses Astro's routing, type system, and
   dev server. Rejected for developer experience reasons.

3. **Full SSR** (`output: 'server'`, all pages server-rendered) — every page
   request hits a Netlify Function. Adds latency and cost for pages that have no
   dynamic content per request. The coaching website has no user-specific
   content, no authentication, no CMS — every page is identical for every
   visitor. Rejected as unnecessary.

4. **Hybrid rendering** (`output: 'server'` with `prerender: true` as default) —
   all existing pages remain statically generated. Only explicitly marked
   endpoints (`export const prerender = false`) run as Netlify Functions.
   **Chosen.**

## Decision

Use Astro's hybrid rendering model: `output: 'server'` with the
`@astrojs/netlify` adapter. All pages are prerendered by default. Server-side
endpoints opt in via `export const prerender = false`.

> **Astro version note:** In Astro 4, this behavior required `output: 'hybrid'`.
> Astro 5+ unified `hybrid` into `server` with `prerender: true` as the default
> for all pages. This project runs Astro 6, so `output: 'server'` is the correct
> and only configuration.

### Configuration

```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  // ...
});
```

### Rendering rules

| Route type      | Rendering    | Example                                       |
| :-------------- | :----------- | :-------------------------------------------- |
| Marketing pages | Static (SSG) | `/`, `/services`, `/contact`                  |
| Legal pages     | Static (SSG) | `/privacy`, `/terms`                          |
| API endpoints   | Server (SSR) | `/api/stripe/webhook`, `/api/stripe/checkout` |

Pages are static by default — no `prerender` export needed. Only server
endpoints explicitly set `export const prerender = false`.

### Security considerations

- Stripe secret key and webhook signing secret are stored as Netlify environment
  variables, never committed to the repository
- Server-side endpoints run in Netlify Functions — secrets are available via
  `import.meta.env` but never included in the client-side bundle
- Webhook signature verification is mandatory for all incoming Stripe events
- Astro's `import.meta.env` validation (via `env.d.ts`) should enforce that
  required server secrets are present at build/runtime

### What does NOT change

- All existing pages remain statically generated — zero performance impact
- Client-side interactivity (Quiz, ServiceCategoryTabs, CoachDetailModal)
  continues to work as before — it is independent of the rendering model
- The quiz context persistence via sessionStorage (ADR-0021) is unaffected —
  sessionStorage is a client-side API regardless of whether the page is
  statically or server-rendered
- Netlify Forms continue to work for the contact form
- Build and deployment workflow remain the same (Netlify auto-deploys)

### What changes

- `@astrojs/netlify` adapter added as a deployment/runtime adapter dependency
- `astro.config.mjs` gains `output: 'server'` and `adapter: netlify()`
- Server-side API routes become possible in `src/pages/api/`
- Netlify Functions are automatically generated for server-rendered routes
- `astro dev` starts an SSR-capable dev server (transparent for static pages,
  but API routes run in a Node.js process rather than a Lambda — see Dev/Prod
  parity note below)

## Consequences

### Positive

- Stripe integration can use Astro's built-in API routes with full TypeScript
  support, shared types, and the same dev server (`astro dev`)
- No separate backend service to deploy and maintain
- Zero impact on existing static pages — same build output, same performance
- Incremental: new server endpoints can be added without touching existing pages
- Netlify handles the Function infrastructure (cold starts, scaling, logging)

### Negative

- Adds `@astrojs/netlify` as a deployment/runtime adapter dependency
- Server endpoints are coupled to Netlify's Function runtime — migrating to
  another platform requires adapter replacement (mitigated by ADR-0018's Netlify
  commitment)
- Cold start latency for server endpoints (~200–500ms on Netlify Functions);
  acceptable for checkout flows and webhooks
- **Dev/Prod parity**: `astro dev` runs API routes in a long-lived Node.js
  process, while production runs them as Netlify Functions (Lambda). Edge cases
  like request timeouts, body size limits, or cold start behavior may differ.
  Stripe webhook testing requires the Stripe CLI for local forwarding
  (`stripe listen --forward-to localhost:4321/api/stripe/webhook`)

### Risks / future considerations

- If future requirements introduce authenticated user dashboards, personalized
  content, or CMS-driven dynamic pages, the hybrid model should be re-evaluated
  — additional pages may need `prerender: false`
- Stripe webhook reliability requires idempotent event processing and retry-safe
  handling — this is a Stripe architecture concern, not a rendering concern, and
  will be addressed in a dedicated ADR for the Stripe integration

## Scope

This ADR covers the **rendering model** decision only. The Stripe integration
architecture (endpoint design, error handling, idempotency, webhook retry
behavior, payment flow) is a separate concern and will be documented in its own
ADR when that work begins.

## References

- [Astro Server Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro Netlify Adapter](https://docs.astro.build/en/guides/integrations-guide/netlify/)
- [Stripe CLI Webhook Testing](https://docs.stripe.com/stripe-cli/overview)
- [ADR-0018: Commit to Netlify as Production Platform](0018-commit-to-netlify-as-production-platform.md)
- [ADR-0021: sessionStorage for Quiz Context Persistence](0021-session-storage-quiz-persistence.md)
