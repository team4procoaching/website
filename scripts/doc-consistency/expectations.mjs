/**
 * Doc-consistency expectation descriptors — the frozen policy data this sensor
 * enforces.
 *
 * This is the "registry" the requirements warned about, deliberately located
 * where its own drift is already guarded by the layers the project trusts: it
 * lives in a scripts/ file that is unit-tested, typechecked, and Phase-4
 * reviewed — the same guard tier as the BASELINE table in
 * scripts/biome-rules/baseline.mjs. Each descriptor is content-addressed (file +
 * section anchor + required tokens / link target), never line-numbered, so prose
 * reflow within a section does not break it.
 *
 * Imported by:
 * - scripts/check-doc-consistency.mjs (CLI runner)
 * - scripts/doc-consistency/checks.test.mjs (unit tests)
 *
 * Enrolment obligation: a new canonical-pointer-note, precedence line, or roster
 * copy added to the docs must be enrolled here to be guarded. See
 * docs/CONVENTIONS.md § Canonical-Pointer-Note Contract (ADR-0059).
 */

/**
 * @typedef {{ file: string, sectionAnchor: string, expectedLinkTarget: string }} S1Descriptor
 */

/**
 * Shape S1 — standalone italic canonical-pointer-note. The four uniform
 * surfaces: the CLAUDE.md roster note, the AGENTS.md Quick-Fix note, and the
 * ARCHITECTURE.md / MAINTENANCE.md renovate notes. No hardcoded literal in the
 * recognition function shadows these fields — the link targets live here only.
 *
 * @type {readonly S1Descriptor[]}
 */
export const S1_DESCRIPTORS = Object.freeze([
  Object.freeze({
    file: 'CLAUDE.md',
    sectionAnchor: 'agent-architecture',
    expectedLinkTarget: 'docs/AGENTS.md#the-seven-subagents',
  }),
  Object.freeze({
    file: 'docs/AGENTS.md',
    sectionAnchor: 'quick-fixes-skip-phases-1-and-2',
    expectedLinkTarget: 'CLAUDE.md#quick-fix-vs-feature',
  }),
  Object.freeze({
    file: 'docs/ARCHITECTURE.md',
    sectionAnchor: 'update-strategy',
    expectedLinkTarget: 'renovate.md#update-strategy--package-rules',
  }),
  Object.freeze({
    file: 'docs/MAINTENANCE.md',
    sectionAnchor: 'update-strategy-matrix',
    expectedLinkTarget: 'renovate.md#update-strategy--package-rules',
  }),
]);
