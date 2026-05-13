# Canonical filename convention for `docs/debt/` per-report files

Date: 2026-05-11

## ADR Warrant Check

Mark at least one trigger; otherwise this is not an ADR but a commit message,
JSDoc note, or [`docs/CONVENTIONS.md`](../CONVENTIONS.md#when-to-write-an-adr)
entry.

- [x] **A — Contract**: the decision creates or changes a contract future code
      must honour. — Two agents (`reviewer` audit mode, `debt-auditor`) emit
      report files under `docs/debt/`, and the orchestrator wires `REGISTER.md`
      "Audit source" cells against those filenames. A consistent, documented
      naming rule is the contract; a future agent-prompt edit that re-introduces
      a `-review` suffix or a bare-date form for audit reports would violate it.
- [x] **B — Asymmetry**: the decision sets a deliberate asymmetry a future
      contributor or AI-assisted edit would otherwise tidy back to symmetry. —
      This ADR *removes* a prior asymmetry (the "`audit-` is reviewer-only, never
      debt-auditor" split). Removing it is itself a decision a future
      AI-assisted edit might "helpfully" re-introduce, thinking the unification
      was an oversight; the ADR records that the unification was deliberate.
- [ ] **C — External revisit**: the decision has a documented external revisit
      trigger or post-condition the contract depends on.

Not triggers: large diff, type-system involvement, placeholder removal, "the
architect found this decision interesting".

## Status

Accepted

## Context

Per-report files under `docs/debt/` are the source documents that feed entries
in `docs/debt/REGISTER.md` — a reviewer audit-mode report, a debt-auditor run,
or a hand-written follow-up/note bundle. As of 2026-05-11 there was **no single
canonical filename convention**. Five sources disagreed, and the on-disk reality
matched none of the prose specs:

| Source | Said |
| ------ | ---- |
| On disk | Reviewer audits: `audit-<YYYY-MM-DD>-<scope>-review.md` (literal `audit-` prefix + `-review` suffix). Hand-written note bundles: `<YYYY-MM-DD>-<scope>.md` (no prefix, no suffix). |
| `.claude/agents/reviewer.md` | `docs/debt/<YYYY-MM-DD>-audit-<scope-slug>.md` (date first, `audit-` infix, no `-review`) — matched no file. |
| `docs/debt/REGISTER.md` header (mirrored in `REGISTER.template.md`) | "live under `docs/debt/<YYYY-MM-DD>-<scope>.md` … Reviewer-audit reports carry the prefix `audit-`." — internally contradictory (date-first pattern vs. "prefix"). |
| `.claude/agents/debt-auditor.md` | `docs/debt/<YYYY-MM-DD>-<scope-slug>.md`; "The prefix `audit-` is reserved for reviewer audits — do not use it." |
| `docs/AGENTS.md` | "produces findings in `docs/debt/<date>-<scope>.md`." — no mention of the reviewer-audit form. |

Two report-producing roles, two report types — but **zero debt-auditor reports
existed on disk**; every non-`audit-` file was a manually-written follow-up
bundle, not an agent run. The "Audit source" column of `REGISTER.md` references
report filenames verbatim, so any rename couples to that column. No scripts, CI
checks, or build tooling parse these filenames — the only consumers are
documentation and the agent prompts.

### Decision drivers

- **Reduce drift surface under an AI-first workflow** — the project optimises for
  typed boundaries, low blast radius, and structural protection over discipline;
  a negative cross-agent instruction ("don't use `audit-`") is a standing
  drift-magnet.
- **One canonical form, stated once** — five disagreeing sources is the failure
  mode this ADR exists to end.
- **A self-describing directory** — a reader of `docs/debt/` should be able to
  tell what each file is from its name without opening it.
- **Match the owner's stated preference** — audits clustering at the top of a
  name-sorted listing.
- **YAGNI** — don't add structure (subdirectories) or optimise for events that
  have never occurred (re-audit of the same scope).

### Evaluated approaches

1. **Date-first, single shape, no `audit-` marker** (`<YYYY-MM-DD>-<scope>.md`
   for everything) — clean, but audits do not cluster, and it drops a distinction
   the owner wanted preserved in *some* form. Rejected.
2. **Keep the reviewer/auditor split, fix only the spelling** (`audit-…` for
   reviewer audits, bare-date for debt-auditor) — preserves the split, but the
   split is not load-bearing for a reader (the report body already says which
   agent ran) and the negative instruction stays a drift-magnet. Rejected.
3. **Scope-first** (`audit-<scope>-<YYYY-MM-DD>.md`) — optimises for re-auditing
   the same scope, which has never happened (zero scopes repeat across the 7
   files on disk), at the cost of chronological order, which is the access
   pattern that does happen. Rejected.
4. **`audit-` as a subdirectory** (`docs/debt/audit/<YYYY-MM-DD>-<scope>.md`) —
   the right tool when a flat directory stops scaling; `docs/debt/` has 9 files
   after ~6 weeks. YAGNI. Rejected.
5. **`audit-` prefix for all systematic-findings reports, `-review` dropped,
   `notes-` prefix for hand-curated bundles.** **Chosen.**

## Decision

### The canonical convention

Files under `docs/debt/` fall into exactly three categories, each with a fixed
name shape:

| Category | Name shape | Produced by |
| -------- | ---------- | ----------- |
| The register and its template | `REGISTER.md`, `REGISTER.template.md` | maintained by the orchestrator |
| Systematic-findings reports | `audit-<YYYY-MM-DD>-<scope-slug>.md` | `reviewer` (audit mode) **or** `debt-auditor` |
| Hand-curated follow-up / note bundles | `notes-<YYYY-MM-DD>-<scope-slug>.md` | written ad hoc when items are observed outside a formal audit |

- `<YYYY-MM-DD>` is the date the report was produced; `<scope-slug>` is a
  kebab-case description of the area covered.
- There is **no `-review` suffix** — it is redundant with `audit-` and reads as
  a duplicate type label. Descriptive detail belongs in `<scope-slug>`.
- The `docs/debt/` namespace is **exhaustive**: every file is `REGISTER*`,
  `audit-…`, or `notes-…`. There is no un-prefixed "default" bucket. (See "Existing
  files" below for the one open question on whether the four pre-existing note
  bundles are renamed retroactively or grandfathered as bare-date.)

### The reviewer/auditor split is removed

`reviewer` audit-mode reports and `debt-auditor` reports both use the `audit-`
prefix. Both are systematic-findings reports produced by an agent from a markdown
template; the difference (Phase-4 review tied to a branch vs. open-ended category
sweep) is captured in the report body and its title line (`# Audit — <scope>`
vs. `# Debt Audit: <scope>`), where a reader who cares about provenance will see
it. The prior negative instruction in `debt-auditor.md` ("the prefix `audit-` is
reserved for reviewer audits — do not use it") and the distinguishing sentence in
`reviewer.md` ("distinguishes this from debt-auditor reports") are deleted.

### Where this rule lives

This ADR is the canonical record. `docs/debt/REGISTER.md` and
`docs/debt/REGISTER.template.md` state the rule in their header paragraph and
link here; `.claude/agents/reviewer.md` and `.claude/agents/debt-auditor.md`
state their output path and link here; `docs/AGENTS.md` mentions the `audit-` and
`notes-` forms and links here. Those documents *restate* the rule for
discoverability — they do not re-specify it. (This mirrors how
[ADR-0035](0035-adopt-subagent-architecture.md) anchors the agent-architecture
prose in `docs/AGENTS.md`.)

The rule is deliberately **not** added to `docs/CONVENTIONS.md`: that document is
the catalog for *code-writing* surfaces, and a debt-report filename is an
agent-output / docs-hygiene rule, not a code convention. Placing it there would
also drag in the Topic-Hub-Index four-site coupling-update for a rule unrelated
to writing code.

### Existing files: audit reports renamed unconditionally; note bundles renamed on owner's call

**The three `audit-…-review.md` files are renamed to drop `-review`,
unconditionally** — the `-review` suffix is the inconsistency this ADR exists to
end:

- `audit-2026-04-26-services-detail-page-review.md` → `audit-2026-04-26-services-detail-page.md`
- `audit-2026-05-01-services-card-link-review.md` → `audit-2026-05-01-services-card-link.md`
- `audit-2026-05-09-sonar-duplications-metric-review.md` → `audit-2026-05-09-sonar-duplications-metric.md`

The `REGISTER.md` "Audit source" cells that cite these files are updated in the
same change. (`audit-2026-05-09-sonar-duplications-metric-review.md` has no
"Audit source" cell — its DEBT ID sits in the "Done" table without a source
column — so it is renamed via `git mv` only.)

**Whether the four pre-existing hand-written note bundles are renamed
retroactively was a deliberate decision, made by the owner at the approval gate.**
The `notes-…` shape applies to note files created from here on regardless. For the
four files that predate this ADR:

- **Recorded decision: renamed retroactively** (the recommended option — uniform
  on-disk state, exhaustive namespace immediately):
  - `2026-04-28-test-fixture-followup.md` → `notes-2026-04-28-test-fixture-followup.md`
  - `2026-05-01-archive-collision-precondition.md` → `notes-2026-05-01-archive-collision-precondition.md`
  - `2026-05-01-doc-topic-hub-followups.md` → `notes-2026-05-01-doc-topic-hub-followups.md`
  - `2026-05-01-statsgrid-stagger-cap-followups.md` → `notes-2026-05-01-statsgrid-stagger-cap-followups.md`

  Their `REGISTER.md` "Audit source" cells (and the `Source:` reference in the
  "Deliberately Accepted" table) are updated to the new names in the same change.
  A one-clause prose update in `notes-2026-04-28-test-fixture-followup.md` line 8
  re-reads "this is a `notes-` bundle, not an `audit-` report" (the original
  wording stayed factually accurate, just slightly stale).

  *(If the owner had instead chosen to grandfather the four bundles, this list and
  its register-cell updates would be dropped, the prose tweak would not happen,
  and `docs/debt/` would carry the four bare-date names until each item closes and
  its file ages out — `notes-…` still applying to all future note files.)*

Full grandfathering of *everything* was rejected outright: leaving the `-review`
suffix and the date-first audit form in place would preserve the exact bimodal
state this ADR exists to end.

### What does NOT change

- The structure of `REGISTER.md` (its tables, the "Audit source" column, the
  prioritisation rules, the exit condition) — only the cited filenames and the
  header paragraph change.
- The `docs/debt/` directory itself — no subdirectories are introduced.
- The content of any existing report file — the renames are pure `git mv`, with
  the single exception of a one-clause prose update in
  `notes-2026-04-28-test-fixture-followup.md` line 8 (only if the four note
  bundles are renamed retroactively; the change is so the sentence reads "this is
  a `notes-` bundle, not an `audit-` report" rather than the now-slightly-stale
  "not an audit report under the `audit-` prefix convention").
- The `04-review-r<n>.md` round-numbering convention for in-flight Phase-4
  reviews under `.claude/work/<task-id>/` — that is a separate, unaffected
  convention.

### Scope and non-goals

**In scope:** the filename shape of per-report files under `docs/debt/`; the
reviewer/auditor `audit-` split; the `-review` suffix; the previously-undocumented
hand-written note bundles.

**Out of scope:** renaming the `REGISTER.md` "Audit source" column header (a
cosmetic call left to the owner); adding a `check:conventions` rule to
mechanically enforce the filename shape (recorded as a follow-up, not implemented
here, to avoid widening `scripts/conventions/` into docs-hygiene inside an
unrelated change); the content of any report file (beyond the one-clause prose
update noted above).

## Consequences

### Positive

- One canonical filename rule, stated once (here) and restated consistently in
  the five places that previously disagreed.
- `docs/debt/` is self-describing: `REGISTER*` / `audit-…` / `notes-…`,
  alphabetically clustered, chronological within each cluster.
- The cross-agent negative instruction ("don't use `audit-`") is gone — one
  fewer drift-magnet in the agent prompts.
- The owner's stated preference (audits cluster at the top of a name-sorted
  listing) is satisfied, and generalised to two clusters.

### Negative

- Up to seven files are renamed; the `REGISTER.md` cell updates that cite them
  land in the *same commit* as the renames, so there is no transient state where
  the register points at a non-existent file. The agent-prompt edits land in a
  following commit, but they reference the new shape, which already exists by
  then.
- The reviewer-vs-auditor provenance is no longer encoded in the filename — a
  process-auditor must open the report to see which agent produced it. Judged an
  acceptable loss: the provenance is in the report body and title line, and the
  distinction was never load-bearing for a directory reader (zero debt-auditor
  reports had ever been produced).
- A new prefix (`notes-`) is one more thing to know. Judged worth it: it makes
  the namespace exhaustive (immediately if the four pre-existing bundles are
  renamed, eventually otherwise), which removes the "is this bare-date file a note
  or a mislabeled audit?" ambiguity.

### Risk mitigation

- If a future maintainer decides the reviewer/auditor distinction *does* deserve
  a filename slot, re-introducing it is a one-commit change, and a superseding
  ADR is where the reversal is recorded.
- The follow-up `check:conventions` rule (out of scope here) would mechanically
  catch any future drift back to `-review` or the bare-date form for audits; the
  owner decides whether to schedule it.

## Documentation Updates

This ADR requires updates to the following documents in the same PR as the ADR
itself:

- `docs/debt/REGISTER.md` (header paragraph; "Open" table "Audit source" column;
  "Deliberately Accepted" table "Source:" reference) — state the canonical
  convention + link this ADR; update all cited filenames to the renamed forms.
- `docs/debt/REGISTER.template.md` (header paragraph; example "Audit source"
  cell) — mirror the header rewrite; update the example cell to model the
  canonical shape (`audit-2026-04-24-architecture.md`).
- `.claude/agents/reviewer.md#output` (audit-mode output bullet) — correct the
  path pattern to `docs/debt/audit-<YYYY-MM-DD>-<scope-slug>.md`; remove the
  "distinguishes this from debt-auditor reports" sentence; add a one-line pointer
  to this ADR.
- `.claude/agents/debt-auditor.md#output` (Output section) — correct the path
  pattern and example; delete the "The prefix `audit-` is reserved for reviewer
  audits — do not use it." line; add a one-line pointer to this ADR.
- `docs/AGENTS.md#non-phase-agents` (debt-auditor paragraph; optionally the "What
  Lives Where" inventory) — correct the path pattern; add a half-sentence on the
  `notes-` form; optional one-line pointer to this ADR.
- `docs/ARCHITECTURE.md` — add the ADR-0048 row to § ADR Quick Reference, **and**
  broaden the `docs/debt/` project-tree comment ("Debt register + individual audit
  reports" → "Debt register + audit/notes reports").

No other documents are affected: `CLAUDE.md`'s `docs/debt/` references are to
`REGISTER.md` / the directory generally (no filename-shape dependency);
`CONTRIBUTING.md` covers commit/branch/PR workflow only; `docs/CONVENTIONS.md` is
code-writing conventions only and deliberately not the home for this rule;
`docs/task-templates/` has no debt-report template.

## References

- [ADR-0035 — Adopt subagent architecture](0035-adopt-subagent-architecture.md)
  (the `reviewer` and `debt-auditor` roles, and the ADR-anchored-prose pattern
  reused here)
- `.claude/agents/reviewer.md`, `.claude/agents/debt-auditor.md` (the agent
  prompts that emit report files)
- `docs/debt/REGISTER.md` (the register the reports feed)
- Concept document: `.claude/work/2026-05-11-debt-report-filename-convention/02-concept.md`
