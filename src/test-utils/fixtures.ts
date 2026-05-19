/**
 * Typed fixture builders for component-layer tests under ADR-0037.
 *
 * Each test file imports the builders it needs directly:
 *
 *   import { buildFaqItems, buildStats } from '~/test-utils/fixtures';
 *
 * No barrel — this file is the single grep-visible surface for fixture
 * construction (`rg "from '~/test-utils/fixtures'"`).
 *
 * The Props bundles for `.astro` components (`CtaProps`,
 * `SectionHeaderProps`) are defined locally rather than derived from the
 * components, because Astro 6.1.5 does not expose component Props as a
 * queryable type on the default export. Mirror the component frontmatter
 * field-by-field; render-time test failure catches drift.
 */
import type { FaqItem } from '~/data/howItWorks';
import { routes } from '~/data/routes';
import type {
  SessionService,
  SubscriptionService,
  SubscriptionServiceWithCompleteDetailContent,
} from '~/data/services';
import type { Stat } from '~/data/stats';
import type { CtaAction, SecondaryCta } from '~/types/components';

// ---------------------------------------------------------------------------
// CTA builder — preserves the optional-spread contract so absent overrides
// stay absent on the returned object (component-side `=`-defaults remain the
// asserted behaviour).
// ---------------------------------------------------------------------------

/**
 * Props bundle for `CTA.astro`. Mirrors the component frontmatter
 * field-by-field — keep in sync if `CTA.astro` changes its Props.
 *
 * @see ~/components/ui/CTA.astro
 */
type CtaProps = {
  headline: string;
  description: string;
  primaryCta: CtaAction;
  secondaryCta?: SecondaryCta;
  headingLevel?: 'h2' | 'h3';
  size?: 'default' | 'compact';
  variant?: 'dark' | 'glass';
};

type CtaOverrides = Partial<CtaProps>;

/**
 * Build a `CTA.astro` Props bundle with sensible defaults.
 * Optional keys are spread conditionally — when an override is absent, the
 * key is absent from the returned object, so the component's `=`-defaults
 * are what each test exercises.
 *
 * @see ~/components/ui/CTA.astro
 */
function buildCtaProps(overrides: CtaOverrides = {}): CtaProps {
  return {
    headline: overrides.headline ?? 'Ready to Get Started?',
    description: overrides.description ?? 'Join us today.',
    primaryCta: overrides.primaryCta ?? ({ label: 'Sign Up', href: '/signup' } satisfies CtaAction),
    ...(overrides.secondaryCta !== undefined && {
      secondaryCta: overrides.secondaryCta,
    }),
    ...(overrides.headingLevel !== undefined && {
      headingLevel: overrides.headingLevel,
    }),
    ...(overrides.size !== undefined && { size: overrides.size }),
    ...(overrides.variant !== undefined && { variant: overrides.variant }),
  };
}

// ---------------------------------------------------------------------------
// SectionHeader builder — same conditional-spread pattern, different
// optional-key set.
// ---------------------------------------------------------------------------

/**
 * Props bundle for `SectionHeader.astro`. The `background` union is
 * inlined rather than imported from `~/styles/sectionStyles` to keep the
 * helper free of styling-module imports — verified byte-equivalent to
 * `SectionBackground` at `sectionStyles.ts:23`.
 *
 * @see ~/components/ui/SectionHeader.astro
 */
type SectionHeaderProps = {
  headline: string;
  eyebrow?: string;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4';
  headingId?: string;
  align?: 'center' | 'left';
  background?: 'default' | 'muted' | 'teal' | 'silver' | 'sage' | 'charcoal';
};

type SectionHeaderOverrides = Partial<SectionHeaderProps>;

/**
 * Build a `SectionHeader.astro` Props bundle with sensible defaults.
 * Same conditional-spread idiom as `buildCtaProps` over the five optional
 * keys.
 *
 * @see ~/components/ui/SectionHeader.astro
 */
function buildSectionHeaderProps(overrides: SectionHeaderOverrides = {}): SectionHeaderProps {
  return {
    headline: overrides.headline ?? 'X',
    ...(overrides.eyebrow !== undefined && { eyebrow: overrides.eyebrow }),
    ...(overrides.headingLevel !== undefined && {
      headingLevel: overrides.headingLevel,
    }),
    ...(overrides.headingId !== undefined && {
      headingId: overrides.headingId,
    }),
    ...(overrides.align !== undefined && { align: overrides.align }),
    ...(overrides.background !== undefined && {
      background: overrides.background,
    }),
  };
}

// ---------------------------------------------------------------------------
// Array builders — `n × default-shape` only. Empty-list and per-entry
// custom literals stay inline at the call site by design.
// ---------------------------------------------------------------------------

/**
 * Build `n` `FaqItem` records with placeholder question/answer text.
 * Returns `readonly FaqItem[]` to match `Accordion.astro`'s
 * `items: readonly FaqItem[]` Prop verbatim.
 *
 * @see ~/components/ui/Accordion.astro
 */
function buildFaqItems(n: number): readonly FaqItem[] {
  return Array.from({ length: n }, (_, i) => ({
    question: `Q${i + 1}`,
    answer: `A${i + 1}`,
  }));
}

/**
 * Build `n` `Stat` records with placeholder labels.
 * Returns `readonly Stat[]` to match `StatsGrid.astro`'s
 * `stats: readonly Stat[]` Prop verbatim.
 *
 * @see ~/components/ui/StatsGrid.astro
 */
function buildStats(n: number): readonly Stat[] {
  return Array.from({ length: n }, (_, i) => ({
    target: 100,
    label: `L${i + 1}`,
  }));
}

// ---------------------------------------------------------------------------
// Service builders — typed-narrow fixtures for service-section component
// tests. Two variants over the same base shape:
//
//   - `buildBareServiceFixture` — the minimal `SubscriptionService`: required
//     fields only, no detail-page content, so `hasCompleteDetailContent()`
//     returns false and the consuming card renders the non-eligible footer.
//   - `buildServiceFixture` — composes the bare fixture and layers the
//     detail-page fields on top so the result satisfies
//     `hasCompleteDetailContent()` at the launch-gate minimum thresholds
//     (`fitFor.length >= 3`, `faq.length >= 3`,
//     `detailedFeatures.length >= 3`, non-empty `lead`).
//
// Both are pinned to the `SubscriptionService` arm of the {@link Service}
// union (ADR-0047) because every current consumer renders against the
// subscription shape. Pinning the override type to `SubscriptionService`
// keeps `pricingModel` from widening to `'subscription' | 'session'` on the
// spread, which would break the discriminator narrowing on the returned
// object. The session arm has its own parallel builder
// (`buildSessionServiceFixture`, below) — a future test that needs a
// session-variant fixture uses that builder rather than constructing
// inline.
// ---------------------------------------------------------------------------

type ServiceFixtureOverrides = Partial<SubscriptionService>;

/**
 * Build a bare `SubscriptionService` fixture: the required `Service` fields
 * only, none of the optional detail-page fields. `hasCompleteDetailContent()`
 * returns false on the result, so a no-detail consumer (card non-eligible
 * footer, badge contact fallback) is what each call site exercises.
 *
 * `contactHref` defaults to `${routes.contact}?service=<id>` derived from the
 * (possibly-overridden) `id`, so a call passing `{ id: 'get-lean' }` gets a
 * matching `contactHref` without restating it; an explicit
 * `overrides.contactHref` still wins via the trailing spread.
 *
 * The no-detail counterpart of {@link buildServiceFixture} — pinned to the
 * `SubscriptionService` arm for the same `pricingModel`-narrowing reason.
 *
 * @see ~/data/services
 */
function buildBareServiceFixture(overrides: ServiceFixtureOverrides = {}): SubscriptionService {
  const id = overrides.id ?? 'busy';
  return {
    id,
    name: 'Busy',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'wellness',
    pricingModel: 'subscription',
    pricing: [
      {
        period: 'monthly',
        price: '€299',
        suffix: '/month',
        amount: 299,
        currency: 'EUR',
      },
      {
        period: 'six-months',
        price: '€1,599',
        suffix: 'one-time',
        amount: 1599,
        currency: 'EUR',
      },
      {
        period: 'twelve-months',
        price: '€2,899',
        suffix: 'one-time',
        amount: 2899,
        currency: 'EUR',
      },
    ],
    features: ['feature one'],
    contactHref: `${routes.contact}?service=${id}`,
    ...overrides,
  };
}

/**
 * Build a `SubscriptionServiceWithCompleteDetailContent` fixture with
 * launch-gate-minimum defaults. Composes {@link buildBareServiceFixture}
 * and layers the long-form detail-page fields on top; the defaults
 * satisfy `hasCompleteDetailContent()` so a no-argument call is a detail-
 * eligible `competition-prep` service the subscription-arm section
 * components render against. Pass `overrides` to swap any field per call
 * site need.
 *
 * Pinned to the subscription arm of the
 * {@link ServiceWithCompleteDetailContent} union — every current consumer
 * (`ServiceWhoIsFor`, `ServiceWhatsIncluded`, `ServicePricingBlock`)
 * renders against the subscription shape. A future session-arm fixture
 * is constructed inline by the configurator tests rather than threaded
 * through this builder.
 *
 * @see ~/data/services
 * @see docs/adr/0051-session-service-detail-page-launch-gate.md
 */
function buildServiceFixture(
  overrides: ServiceFixtureOverrides = {},
): SubscriptionServiceWithCompleteDetailContent {
  return {
    ...buildBareServiceFixture({ id: 'competition-prep' }),
    name: 'Competition Prep',
    category: 'bodybuilding',
    lead: 'A non-empty lead paragraph.',
    detailedFeatures: [
      { title: 'A', description: 'a' },
      { title: 'B', description: 'b' },
      { title: 'C', description: 'c' },
    ],
    fitFor: ['fit one', 'fit two', 'fit three'],
    faq: [
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
      { question: 'Q3', answer: 'A3' },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Session-service builder — bare-shape `SessionService` fixture for the
// session arm of the {@link Service} union. Mirrors
// {@link buildBareServiceFixture} for the subscription arm; the parallel
// exists because the `SessionService` discriminator (`pricingModel:
// 'session'`) cannot flow through `buildBareServiceFixture`'s
// `SubscriptionService`-pinned signature without widening `pricingModel`
// to `'subscription' | 'session'` and breaking discriminator narrowing on
// the returned object. The detail-page launch-gate fields (`packages`,
// `descriptions`, `recommendedPackageSize`) stay out of this builder — the
// configurator test layers them on top via spread to reach
// {@link import('~/data/services').SessionServiceWithCompleteDetailContent}.
// ---------------------------------------------------------------------------

type SessionServiceOverrides = Partial<SessionService>;

/**
 * Build a bare `SessionService` fixture: the required `Service` fields plus
 * the session-arm specifics (`configuration` matrix, single-entry `pricing`
 * tuple), none of the optional detail-page fields. `hasCompleteDetailContent`
 * returns false on the result, so a no-detail consumer (card non-eligible
 * footer) is what each call site exercises by default. Override-spreading
 * with the launch-gate fields produces a
 * {@link import('~/data/services').SessionServiceWithCompleteDetailContent}.
 *
 * `contactHref` defaults to `${routes.contact}?service=<id>` derived from the
 * (possibly-overridden) `id`, so a call passing `{ id: 'other-session' }` gets
 * a matching `contactHref` without restating it; an explicit
 * `overrides.contactHref` still wins via the trailing spread.
 *
 * The session-arm parallel of {@link buildBareServiceFixture} — pinned to
 * the `SessionService` arm for the same `pricingModel`-narrowing reason.
 *
 * @see ~/data/services
 * @see docs/adr/0047-session-based-service-treatment.md
 */
function buildSessionServiceFixture(overrides: SessionServiceOverrides = {}): SessionService {
  const id = overrides.id ?? 'posing';
  return {
    id,
    name: 'Posing & Stage Presence',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'bodybuilding',
    pricingModel: 'session',
    pricing: [
      {
        period: 'monthly',
        price: '€149',
        suffix: '/session',
        amount: 149,
        currency: 'EUR',
      },
    ],
    configuration: {
      sessionCounts: [1, 5, 10],
      durations: [30, 60],
    },
    features: ['feature one'],
    contactHref: `${routes.contact}?service=${id}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Exports — collected at end of file per CONVENTIONS.md §Exports.
// ---------------------------------------------------------------------------

export {
  buildBareServiceFixture,
  buildCtaProps,
  buildFaqItems,
  buildSectionHeaderProps,
  buildServiceFixture,
  buildSessionServiceFixture,
  buildStats,
};
export type {
  CtaOverrides,
  CtaProps,
  SectionHeaderOverrides,
  SectionHeaderProps,
  ServiceFixtureOverrides,
  SessionServiceOverrides,
};
