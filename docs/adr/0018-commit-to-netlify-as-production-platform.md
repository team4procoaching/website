# Commit to Netlify as Production Hosting Platform

Date: 2026-03-27

## Status

Accepted

## Context

The team4procoaching website has been developed on Netlify since project
inception. Netlify was chosen based on prior experience from a Gatsby project:
familiar workflow, excellent GitHub integration, built-in form handling, and
Deploy Previews that enable non-technical stakeholders to review changes before
they go live.

As the site approaches production readiness, the following factors require a
deliberate decision on whether to proceed with Netlify or migrate before
committing further:

1. **Credit-based pricing model.** Netlify uses a unified credit system with 300
   credits per month on the free plan. The primary cost drivers are:

   | Feature           | Credit Cost           |
   | :---------------- | :-------------------- |
   | Production deploy | 15 credits each       |
   | Form submission   | 1 credit each         |
   | Bandwidth         | 10 credits per GB     |
   | Web requests      | 3 credits per 10k     |
   | Compute           | 5 credits per GB-hour |

   When credits are exhausted, **all projects on the account are paused** —
   visitors see a "Site not available" page. Deploy Previews are free and
   unlimited and do not consume credits.

2. **Cloudflare acquired The Astro Technology Company** (January 2026). Astro
   remains open-source and platform-agnostic (MIT license), but the framework
   team is now employed by Cloudflare. This creates a natural alignment between
   Astro and Cloudflare Pages/Workers that may result in first-class
   optimizations over time.

3. **Two features about to go live deepen the platform binding:**
   - **Netlify Forms** (`data-netlify="true"`, honeypot spam protection) is
     implemented in the contact form, pending deployment to production.
   - **Stripe Checkout + Webhook** integration is the next implementation step.
     A working prototype exists using Astro API Routes
     (`src/pages/api/create-checkout.ts`, `src/pages/api/webhook.ts`) with
     Resend for email notifications. The business logic is framework-portable
     (standard Astro `APIRoute` handlers), but deploying server-side routes on
     Netlify requires the `@astrojs/netlify` adapter, which replaces the
     `@astrojs/node` adapter used in the local prototype.

This ADR documents the decision to proceed with Netlify for production rather
than migrate to an alternative platform at this point.

### Alternatives Considered

**Cloudflare Pages + Workers**

- Now owns the Astro framework team — likely to receive first-class Astro
  integration and optimizations over time.
- Generous free tier (500 deploys/month, unlimited bandwidth, 100,000 Worker
  invocations/day).
- No built-in form handling — requires Workers or a third-party service (e.g.,
  Formspree, Basin).
- Different configuration model (`_headers`, `_redirects`, `wrangler.toml`
  instead of `netlify.toml`).
- Stripe API Routes would work via the `@astrojs/cloudflare` adapter — same
  portability story as Netlify, different adapter.
- Migration cost: rewrite form handling, replace `netlify.toml` configuration,
  adapt CI/CD pipeline, update CONTRIBUTING.md and documentation.

**Vercel**

- Excellent Astro support and developer experience.
- No built-in form handling — same third-party requirement as Cloudflare.
- Stripe API Routes would work via the `@astrojs/vercel` adapter.
- Free tier: 100 deploys/day, 100 GB bandwidth/month.
- Provides a `vercel.json` configuration and automatic framework detection.
- Migration cost: similar to Cloudflare, plus adapting deploy preview
  references.

**Self-hosted (e.g., Hetzner + Caddy)**

- Maximum control, no vendor lock-in, predictable cost.
- Significant operational overhead: TLS, CDN, CI/CD pipeline, form backend,
  monitoring — disproportionate for a coaching website side project.
- Rejected as not cost-effective for the current team size and scope.

## Decision

We confirm **Netlify** as the production hosting platform for
team4procoaching.com, accepting the platform bindings this creates.

The key reasons for staying with Netlify:

1. **Deploy Previews for coach self-service.** The long-term goal is that
   coaches maintain content themselves via Pull Requests. Each PR triggers a
   free Deploy Preview (`https://deploy-preview-{PR}--team4pro.netlify.app`)
   where coaches can verify their changes as many times as needed before
   merging. This workflow is central to the project's operating model and works
   out of the box on Netlify at zero cost.
2. **Integrated form handling.** Netlify Forms with honeypot spam protection
   eliminates the need for a third-party form service or custom backend. This is
   the single feature that differentiates Netlify most clearly from the
   alternatives for this project.
3. **Portable Stripe integration.** The Stripe Checkout and Webhook logic is
   implemented as standard Astro API Routes. Only the adapter
   (`@astrojs/netlify` vs. `@astrojs/cloudflare` vs. `@astrojs/node`) is
   platform-specific — the business logic is portable.
4. **Sunk investment.** The build pipeline, deploy configuration, security
   headers, and documentation (CONTRIBUTING.md, ARCHITECTURE.md) are already
   built around Netlify. Migration would cost development time without
   delivering user-facing value.
5. **Operational simplicity.** A single platform for hosting, forms, server-
   side API routes, and deploy previews reduces the number of moving parts.

### Deployment Strategy

Production deploys consume the largest share of credits (15 per deploy). To
operate within the 300-credit free tier budget:

- **Launch phase (first weeks):** Auto-deploy on merge to `main` is disabled.
  Production deploys are triggered manually to control credit consumption during
  the period of frequent changes.
- **Steady state:** Once the site has stabilized, auto-deploy will be re-enabled
  so that coaches can merge PRs and see their changes go live without developer
  involvement.
- **The `ignore` script in `netlify.toml`** cancels builds when no changes are
  detected in critical paths (`src/`, `public/`, config files), saving 15
  credits per skipped build.

### Scope and Non-Goals

**In Scope:**

- Hosting, CDN, and deployment of the Astro site
- Form submission handling via Netlify Forms
- Server-side Astro API Routes for Stripe (via `@astrojs/netlify` adapter)
- Security headers and redirect configuration via `netlify.toml`
- Deploy Previews for the PR-based review workflow

**Out of Scope:**

- DNS management (handled by Cloudflare, independent of hosting)
- Transactional email delivery (handled by Resend, independent of hosting)
- CMS or content API (content is Git-based per ADR-0011)

## Consequences

### Positive

- **No migration cost**: The existing pipeline, documentation, and team
  knowledge remain valid.
- **Coach autonomy**: Free, unlimited Deploy Previews enable a self-service
  content workflow without consuming the credit budget.
- **Single vendor for hosting + forms + API routes**: Reduces integration
  complexity and the number of accounts to manage.
- **Low Stripe lock-in**: The Astro API Route pattern means switching hosters
  only requires changing the Astro adapter — no rewrite of business logic.
- **Familiar platform**: Reduced ramp-up time for anyone joining the project.

### Negative

- **Platform binding.** The following artifacts are Netlify-specific and would
  need adaptation if migrating:

  | Binding                    | Location                        | Migration Effort |
  | :------------------------- | :------------------------------ | :--------------- |
  | `data-netlify="true"`      | Contact form component          | Medium           |
  | Honeypot field             | Contact form component          | Medium           |
  | Netlify Forms backend      | Dashboard (submissions, alerts) | High             |
  | `@astrojs/netlify` adapter | `astro.config.mjs`              | Low (swap)       |
  | `netlify.toml`             | Repository root                 | Medium           |
  | Deploy Preview URLs        | CONTRIBUTING.md, PR workflow    | Low              |
  | Build `ignore` script      | `netlify.toml`                  | Low              |

- **Credit budget pressure.** 300 credits per month limits production deploys to
  ~20 if no other meters are active. Form submissions (1 credit each),
  bandwidth, and compute for Stripe API routes further reduce the available
  budget. Exhausting credits pauses all projects on the account.
- **Cloudflare/Astro alignment.** As Cloudflare deepens Astro integration,
  Netlify may fall behind in framework-specific optimizations. This is
  speculative but worth monitoring.

### Risk Mitigation

- **Credit exhaustion**: The `ignore` script and phased auto-deploy activation
  keep credit usage controlled. In steady state, the site should require only a
  handful of production deploys per month. If the project outgrows the free
  tier, upgrading to the Personal plan ($9/month) provides additional credits.
- **Netlify Forms as deepest binding**: Forms is the only component without a
  direct Astro-level equivalent. If migrating, this would require a third-party
  form service or a custom API route. The rest of the Netlify integration is
  either configuration (`netlify.toml` → equivalent config file) or an adapter
  swap.
- **Framework alignment shift**: Astro explicitly commits to remaining
  platform-agnostic. Netlify is a partner in the Astro Ecosystem Fund alongside
  Cloudflare. Monitor Astro release notes for any platform-exclusive features.

## Success Criteria

- Site launches on Netlify without hitting credit limits in the first 3 months
  of production
- Contact form submissions are reliably received via Netlify Forms
- Stripe Checkout and Webhook function correctly via Astro API Routes on the
  `@astrojs/netlify` adapter
- Coaches can independently preview and publish content changes via the PR +
  Deploy Preview workflow
- Monthly Netlify cost remains at $0 (free tier) or ≤ $9 (Personal plan) for the
  first year of operation

## References

- [Netlify Credit-based Pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify How Credits Work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Netlify Forms Documentation](https://docs.netlify.com/forms/setup/)
- [Astro Netlify Adapter](https://docs.astro.build/en/guides/integrations-guide/netlify/)
- [Cloudflare Acquires Astro (January 2026)](https://astro.build/blog/joining-cloudflare/)
- [ADR-0001: Use Astro.js](0001-use-astro-js.md) — initial framework and hosting
  decision
- [ADR-0005: Renovate](0005-adopt-renovate-for-automated-dependency-management.md)
  — dependency management on the same CI pipeline
- [ADR-0011: Content Format Decision Framework](0011-content-format-decision-framework.md)
  — Git-based content strategy
