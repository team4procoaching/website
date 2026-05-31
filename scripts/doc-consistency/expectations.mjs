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
 * docs/CONVENTIONS.md § Canonical-Pointer-Note Contract (ADR-0060).
 */

/**
 * @typedef {{ file: string, sectionAnchor: string, expectedLinkTarget: string }} S1Descriptor
 */

/**
 * @typedef {{ file: string, sectionAnchor: string }} S2Descriptor
 */

/**
 * @typedef {{ file: string, sectionAnchor: string, leadPhrase: string, expectedLinkTarget: string }} S3Descriptor
 */

/**
 * @typedef {{
 *   sources: readonly { file: string, sectionAnchor: string }[],
 *   authoritativeColumns: readonly string[],
 *   phaseColumn: string,
 *   keyColumn: string,
 *   optionalColumns: readonly string[],
 * }} RosterDescriptor
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

/**
 * Shape S2 — link-less precedence line. The single surface: the Critical Rules
 * section head in CLAUDE.md, which names `docs/CONVENTIONS.md / the cited ADR` in
 * prose, NOT as a Markdown link. The shape-invariant tokens (`is a summary`,
 * `canonical prose lives in`, `canonical wins`) live in the recognition function;
 * the only per-surface field is the section anchor.
 *
 * @type {readonly S2Descriptor[]}
 */
export const S2_DESCRIPTORS = Object.freeze([
  Object.freeze({
    file: 'CLAUDE.md',
    sectionAnchor: 'critical-rules-never-break-these',
  }),
]);

/**
 * Shape S3 — inline see-cross-reference. The single surface: the ADR-numbering
 * bullet in CLAUDE.md's Orchestrator Responsibilities section. The recognition is
 * narrowly content-addressed to this one bullet via its unique lead phrase
 * (`Numbers new ADRs`), so it cannot fire on the dozens of ordinary inline
 * see-links elsewhere. `leadPhrase` is incidental prose, not a stable identifier;
 * a reword would stop it matching — by design the safe failure direction is an
 * absence finding (noisy), never a silent skip (blind).
 *
 * @type {readonly S3Descriptor[]}
 */
export const S3_DESCRIPTORS = Object.freeze([
  Object.freeze({
    file: 'CLAUDE.md',
    sectionAnchor: 'orchestrator-responsibilities',
    leadPhrase: 'Numbers new ADRs',
    expectedLinkTarget: 'ARCHITECTURE.md#adr-lifecycle',
  }),
]);

/**
 * Roster equality — the three hand-maintained agent-roster table copies and the
 * normalisation contract under which they are compared (gap c, structural
 * derivation per Approach B). The three tables are NOT byte-identical: ADR-0035
 * carries no Model column, and CLAUDE.md writes the phase as a bare number (`1`)
 * where AGENTS.md / ADR-0035 write `Phase 1`. A naive cell-equality check would
 * therefore fire on every run; the normalisation contract below absorbs both
 * differences so only a genuine divergence (a differing Role, a missing/extra
 * agent, a reordered row, or a Model mismatch between the copies that carry it)
 * is reported.
 *
 * Contract:
 * - `keyColumn` (`Agent`): the row key; row-set equality is asserted on this
 *   column, in order, across all three copies.
 * - `authoritativeColumns` (`Agent`, `Role`): compared literally across all
 *   three copies (after fence/whitespace normalisation in the recognition
 *   function). These are the cells whose divergence misleads a session.
 * - `phaseColumn` (`Phase`): normalised before comparison — a leading `Phase `
 *   token is stripped, so `1` ≡ `Phase 1`; `—` and `post-hoc` compare literally.
 * - `optionalColumns` (`Model`): compared ONLY across the copies that carry the
 *   column. ADR-0035 omits Model by design; comparing a present column against
 *   an absent one is not a divergence.
 *
 * Columns are matched by header name, not positional index, so the comparison is
 * robust if a future column is inserted.
 *
 * @type {RosterDescriptor}
 */
export const ROSTER_DESCRIPTOR = Object.freeze({
  sources: Object.freeze([
    Object.freeze({ file: 'CLAUDE.md', sectionAnchor: 'agent-architecture' }),
    Object.freeze({ file: 'docs/AGENTS.md', sectionAnchor: 'the-seven-subagents' }),
    Object.freeze({
      file: 'docs/adr/0035-adopt-subagent-architecture.md',
      sectionAnchor: 'decision',
    }),
  ]),
  keyColumn: 'Agent',
  authoritativeColumns: Object.freeze(['Agent', 'Role']),
  phaseColumn: 'Phase',
  optionalColumns: Object.freeze(['Model']),
});
