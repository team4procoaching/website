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
// Exports — collected at end of file per CONVENTIONS.md §Exports.
// ---------------------------------------------------------------------------

export { buildCtaProps, buildFaqItems, buildSectionHeaderProps, buildStats };
export type { CtaOverrides, CtaProps, SectionHeaderOverrides, SectionHeaderProps };
