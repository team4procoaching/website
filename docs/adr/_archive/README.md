# Archived ADRs

This directory holds ADRs that are no longer part of the active reference set.
They remain in the repository for historical lookup but are not consulted as
part of day-to-day work.

ADRs are archived in three cases:

- **Superseded** — replaced by a later ADR.
- **Deprecated** — the underlying concern no longer applies.
- **Consolidated** — the substance has been absorbed into a living document
  (typically `docs/CONVENTIONS.md` or `CLAUDE.md`).

Each archived ADR's `Status:` line documents which case applies and points to
the successor or consolidation target.

For the criteria, the archival process, and how cross-references are handled,
see
[`docs/ARCHITECTURE.md` → ADR Lifecycle](../../ARCHITECTURE.md#adr-lifecycle).

The active ADR set lives in the parent directory `docs/adr/`. Active documents
should not link into this archive except for explicit historical references
(e.g., a successor ADR's `Supersedes:` metadata, or a consolidation note).
