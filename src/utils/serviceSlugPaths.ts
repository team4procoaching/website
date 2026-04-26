/**
 * Static-path generation for `/services/[slug]`.
 *
 * Astro 6 routes any `.ts` file inside `src/pages/` as an endpoint, which
 * would crash the build if a `*.test.ts` containing top-level `vitest`
 * `describe` calls landed there. This helper therefore lives outside
 * `src/pages/` — the page module re-exports `getServiceSlugPaths` as
 * `getStaticPaths` to satisfy Astro's routing contract while keeping the
 * test file (and any future testable helpers for the slug route) in a
 * folder where they cannot be picked up by the page router.
 *
 * Pattern reference: ADR-0038 §1 (dynamic detail routes; helper-and-
 * re-export is permitted shape for the route's `getStaticPaths`).
 */
import {
  hasCompleteDetailContent,
  type ServiceId,
  type ServiceWithCompleteDetailContent,
  services,
} from '~/data/services';

/**
 * Domain-narrowed shape of the entries Astro consumes from
 * `getStaticPaths`. Astro's published `GetStaticPathsItem` types
 * `params` and `props` loosely (`string | undefined` and
 * `Record<string, unknown>`); narrowing here ensures a typo in
 * `service.id` or a stray prop is caught at compile time.
 *
 * Not exported — the function's return type is fully inferred for
 * the test, no consumer needs the alias as API surface.
 */
type ServiceSlugPathEntry = {
  readonly params: { readonly slug: ServiceId };
  readonly props: { readonly service: ServiceWithCompleteDetailContent };
};

/**
 * Return one `getStaticPaths` entry per service that passes the
 * launch-gate predicate `hasCompleteDetailContent`. Services that do
 * not yet have complete detail content (sub-threshold arrays, missing
 * `lead`) never produce a route.
 *
 * Pure function — input is the canonical `services` array and the
 * predicate, both from `~/data/services`. Re-exported as
 * `getStaticPaths` from `src/pages/services/[slug].astro`; see
 * ADR-0038 §1 for the helper-and-re-export shape.
 */
function getServiceSlugPaths(): readonly ServiceSlugPathEntry[] {
  return services.filter(hasCompleteDetailContent).map((service) => ({
    params: { slug: service.id },
    props: { service },
  }));
}

// Export
export { getServiceSlugPaths };
