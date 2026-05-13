# Documentation follow-up — ADR collision-avoidance listing not archive-aware

Recorded: 2026-05-01

## Origin

Surfaced during the review of the Documentation-Updates-discipline branch. The
new `docs/adr/_archive/` directory is empty today (only the README), but as soon
as a future archive-migration PR moves any ADR into it, the collision-avoidance
heuristic in `CLAUDE.md` will silently break.

## DEBT-260501-04 — `ls docs/adr/ | tail` not collision-safe after archive contents land

**Finding.** `CLAUDE.md` instructs the Orchestrator to verify the next free ADR
number with `ls docs/adr/ | tail` to avoid collisions in parallel-session
scenarios. Once `docs/adr/_archive/` contains files, the listing will include
the `_archive/` directory entry and any ADR filenames within it depending on
locale/sort. The heuristic relies on the listing showing only top-level
`NNNN-*.md` files; subdirectory contents pollute the result.

**Why it matters.** Today the directory only contains `README.md`, so the
heuristic still works. As soon as the archive-migration PR runs, the listing
produces a polluted result that may either skip the actual highest-numbered ADR
or include archived ADRs in the comparison. The collision-avoidance breaks
silently — no error, just wrong "next free" numbers.

**Suggested resolution.** Change the instruction to `ls docs/adr/*.md | tail`.
The glob excludes the subdirectory entry and any nested files. Single-line edit
in `CLAUDE.md`.

**Effort.** XS — single-line edit, no test impact.

**Precondition for the archive-migration PR.** Must be addressed before any ADR
is moved into `_archive/`. The archive-migration PR is the natural place to fold
this fix in.
