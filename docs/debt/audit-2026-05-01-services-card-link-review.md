# Audit — Services Card Link Review (2026-05-01)

Source for the debt-register entry surfaced during the review of the
`feat/services-card-link` branch (the card-side adopter for the
`/services/[slug]` detail route landed under ADR-0040). Captures the one finding
the reviewer deferred from in-branch fix because the structural concern has no
consumer today and any concrete fix would be speculative until one appears.

One entry. Minor severity. Does not block CMS handover. Does not block
maintenance — the attribute is queried nowhere, so the present-day impact is
zero. The cost recorded here is the future-decision cost when a consumer
materialises.

---

## DEBT-260501-05 — `data-service-card` attribute on `ServiceCard.astro` is unscoped across consumers

**Severity:** minor **Effort:** XS **Blast radius:** One production component
attribute (and one or more new consumers, if and when they appear).

### Problem

`src/components/sections/services/ServiceCard.astro:108` emits
`data-service-card={service.id}` on the card's outer `<div>`. The same attribute
value is rendered by both consumers of `ServiceCard`:

- The catalog grid in `ServicesCatalog.astro` (default `consumer="catalog"`).
- The homepage section in `Services.astro` (`consumer="homepage"`).

The branch that introduced the consumer-prefix scoping for the card's DOM
`id`/`headingId`/`descriptionId` deliberately left this `data-*` attribute
unscoped. Rationale at the time: the attribute is queried nowhere in the
codebase today, so the contract is on `id`, not on `data-service-card`. A
co-rendering page (homepage and catalog cards on the same document, or any
future page that mounts both) emits two elements with identical
`data-service-card="<service-id>"`. A future
`document.querySelectorAll('[data-service-card="competition-prep"]')` would
return two nodes for the same logical service, and any consumer would have to
disambiguate by walking up to the consumer-scoped `id` or by adding its own
filter.

The risk is asymmetric: the IDs the same component now scopes by consumer were
brought into a typed shape precisely so that homepage-vs-catalog co-render was
safe at the DOM-query boundary; the `data-*` attribute sits next to those IDs
and looks like part of the same contract, but isn't. A future contributor adding
a script that targets `[data-service-card]` would reasonably expect the same
scoping property and be silently wrong.

### Recommended fix shape

Consumer-driven, not action-today. When the first real consumer of
`data-service-card` is added (analytics hook, observer for some animation gate,
etc.), pick one of:

1. **Remove the attribute entirely** if the consumer can express its query via
   the consumer-scoped `id` instead (`#service-${consumer}-${service.id}`). This
   is the preferred shape — the typed `id` is already a stronger contract than
   the `data-*` shorthand.
2. **Scope the attribute** by extending the same consumer prefix to its value,
   or by adding a paired `data-service-consumer` attribute. Two candidate shapes
   (exact form depends on the consumer):

   ```text
   prefix-encoded:
       <div data-service-card={`${consumer}-${service.id}`}>

   paired attributes:
       <div data-service-card={service.id} data-service-consumer={consumer}>
   ```

   Choose this if a query needs both consumer dimensions independently.

The decision belongs to the first consumer's concept doc, because the right
shape depends on what the consumer needs. Pre-deciding now risks adding
structure that the actual consumer doesn't use.

Pattern reference: ADR-0040 (interim contact-routing) introduced the
consumer-scoped IDs on `ServiceCard` that this attribute does not yet mirror.

### Why deferred

In-branch action would mean either removing the attribute (no consumer to prove
the removal is safe) or scoping it pre-emptively (no consumer to validate the
scoping shape against). Either choice is structural work without a forcing
function. The branch's contract was on `id` and the eligibility affordance;
extending the contract to a `data-*` attribute that is queried nowhere widens
scope without payoff. Tracking as debt preserves the rationale for the future
maintainer who adds the first consumer and then has to decide remove-or-scope
with this context already written down.
