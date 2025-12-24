# Use of Astro and MDX for the Fitness Coaching Platform

Date: 2025-12-14

## Status

Accepted

## Context

A marketing website needs to be created for a new online fitness coaching
business launched by three founders.

The key requirements are:

- Presentation of services, coaches, and blog content.
- An interactive advisory tool ("Which service fits my needs?") and a contact
  form.
- Future integrations: Video hosting (MUX) and payment processing (Stripe).
- **Constraints:** The budget is limited, so minimizing running costs
  (hosting/licenses) is a priority. The system requires high performance (SEO)
  and security with minimal maintenance effort.

We evaluated the following alternatives:

- **Gatsby:** Experience exists, but declining community activity and
  contributions pose a risk to long-term maintenance.
- **WordPress:** High maintenance effort (security updates, PHP) or costs for
  managed hosting. Page builders often require additional license fees.

## Decision

We will use **Astro** as the primary web framework, hosted on **Netlify** (Free
Tier). For data management and content, we will initially use **MDX** combined
with **Astro Content Collections**.

## Consequences

**Positive:**

- **Cost Efficiency:** Hosting (Netlify) and data storage (Git/MDX) remain
  permanently free, avoiding recurring costs for the founders.
- **Data Integrity:** Astro Content Collections (using Zod schemas) prevent
  build errors by validating content data types (e.g., ensuring every service
  has a price).
- **Performance:** Static Site Generation (SSG) ensures excellent Core Web
  Vitals and SEO.
- **Flexibility:** MDX allows embedding interactive components (Islands)
  directly within content text.
- **Best Practices:** The codebase can follow patterns from established
  open-source projects like the official `astro.build` repository.

**Negative:**

- **Editorial Experience:** Content updates initially require developer tools
  (Code Editor/Git), which might be difficult for non-technical founders (can be
  mitigated later via Git-based CMS).
- **Build Times:** As content scales significantly (hundreds of pages), build
  times on the Netlify Free Tier might become a bottleneck.
