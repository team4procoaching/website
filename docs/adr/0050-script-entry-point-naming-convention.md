# Script Entry-Point Naming Convention: `check-*` / `generate-*` / `query-*`

Date: 2026-05-13

Amends: [ADR-0042](0042-agent-side-sonarcloud-findings-query.md)

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates a naming contract every future
      entry-point script under `scripts/` must honour. The prefix encodes
      runtime role and exit-code semantics: `check-*` is a sensor whose non-zero
      exit is a policy verdict; `generate-*` is a build transformer whose
      non-zero exit is an erzeugung failure; `query-*` is a read-only lookup
      whose exit code only signals runtime status, never policy. The pnpm-script
      names mirror the prefix 1:1 (`check:*`, `generate:*`, `query:*`). Future
      contributors and AI-assisted edits must classify a proposed script into
      one of the three roles before they pick its name.
- [x] **B — Asymmetry**: the classification surface deliberately keeps three
      categories asymmetric in how they earn their place. Sensors (`check-*`)
      are justified by **catch frequency** — they must catch something the
      existing prevention layers would have let through. Transformers
      (`generate-*`) are justified by **build correctness** — the pipeline
      either needs the output or does not. Lookups (`query-*`) are justified by
      **usage frequency** — a tool that the maintainer reaches for at
      AI-iteration cadence pays for itself through repeated invocation, not
      through caught findings. A future contributor evaluating a proposed script
      against a single rubric (catch frequency only, say) would reach the wrong
      conclusion for two of the three classes; the documented asymmetry exists
      precisely to prevent that collapse.
- [x] **C — External revisit**: the convention is revisited when a fourth role
      emerges that none of the three prefixes captures cleanly (e.g., a one-shot
      migration script that mutates the working tree and is meant to be removed
      afterwards). The revisit produces either a fourth prefix with its own
      justification rubric or a successor ADR collapsing the taxonomy. A new
      prefix is not added silently.

## Status

Accepted

## Context

The `scripts/` directory hosts four entry-point scripts today, three of which
share a `check-` prefix:

- `scripts/check-conventions.mjs` — sensor. Exit 0 = policy satisfied; exit 1 =
  convention violated. Chained into `pnpm check`.
- `scripts/check-biome-rule-baseline.mjs` — sensor / CI canary. Exit 0 = the
  empirical-evidence table in ADR-0041 still holds against the installed Biome
  binary; exit 1 = drift. Invoked from `.github/workflows/quality.yml`.
- `scripts/check-sonar-findings.mjs` — **not a sensor**, despite the prefix. Its
  own docstring is explicit: _"the script is a lookup, not a build gate; agent
  quality chains stay green on outages"_. It reads SonarCloud findings via the
  public REST API and prints them; exit 0 on every successful or
  transient-failure path; exit 1 only for local-runtime errors.
- `scripts/generate-csp-hashes.mjs` — build transformer. Exit 0 = CSP hashes
  written; exit ≠ 0 = generation failed and the build can't proceed.

The `check-` prefix on the third script is a semantic bug. The name suggests a
quality gate; the script structurally cannot be one (its exit codes signal
runtime status, never policy verdict). The mismatch has misled both the
maintainer and AI-assisted edits in past sessions — at least once nearly to the
point of killing the script on a "no caught findings" rubric that applies to
sensors but not to lookup tools.

The substantive defect is taxonomic. Three runtime roles (sensor, transformer,
lookup) had been collapsed into a single "checks" category, and the collapse
propagated into scoping conversations where the wrong justification rubric was
applied. Fixing the single filename addresses the surface symptom; introducing a
naming convention prevents the same collapse from recurring on the next script
that lands under `scripts/`.

### Decision drivers

- **AI-first working mode.** This project is maintained solo and most future
  work is AI-generated. Optimising for typed boundaries and structural
  enforcement (file-name encodes role) beats optimising for per-contributor
  discipline (remember the docstring says "lookup"). A future agent reading
  `scripts/query-sonar-findings.mjs` classifies the script correctly at the
  first glance; one reading `scripts/check-sonar-findings.mjs` first has to
  reconcile the prefix against the docstring.
- **Bus factor.** A replacement maintainer reading `package.json` should be able
  to infer the script's blocking-or-informational nature from the prefix alone.
  `pnpm check:*` is something CI cares about; `pnpm query:*` is something the
  maintainer reaches for between coding iterations. The distinction belongs in
  the name.
- **No new infrastructure.** The convention is enforced by review and by the
  upstream classification step in the architect's concept phase, not by a new
  sensor that lints script filenames. At four entry-points growing slowly, the
  review-time enforcement matches the surface size.
- **Domain subdirectories are unaffected.** `scripts/sonar-findings/`,
  `scripts/conventions/`, `scripts/biome-rules/` are named by domain, not by
  operation. The convention applies only to entry-point scripts directly under
  `scripts/`, not to the supporting subdirectories.

### Evaluated approaches

1. **Status quo plus discipline.** Keep `check-sonar-findings.mjs` and rely on
   the docstring to disambiguate. Rejected: discipline failed at least once and
   the AI-first working mode amplifies the cost of every future re-discovery.
   The structural fix is durable; the discipline fix is not.
2. **Directory-based classification.** Reorganise `scripts/` into
   `scripts/checks/`, `scripts/tools/`, `scripts/build/`. Rejected: ceremony
   without payoff at four entry-points. The directory cost (re-hashed imports,
   ADR sweep, `package.json` path edits) is the same as the rename but produces
   a structurally larger PR and a less-discoverable surface (the script's role
   is encoded in the parent directory, not in the name that appears in
   `package.json` and in invocation commands).
3. **Prefix-based naming convention (`check-*` / `generate-*` / `query-*`) plus
   the `check-sonar-findings` → `query-sonar-findings` rename. Chosen.** Encodes
   role in the most-visible place (the filename and the pnpm-script name). The
   taxonomy is documented in `docs/CONVENTIONS.md` so future contributors
   discover it task-first when adding a script. The current misclassification is
   corrected in the same PR that introduces the convention.

## Decision

Every entry-point script under `scripts/` (i.e., every `.mjs` file directly
under `scripts/` that serves as the entry point for a pnpm-script invocation,
not under a subdirectory) carries a prefix that matches one of three roles. The
pnpm-script name in `package.json` mirrors the prefix 1:1. Test files co-located
with their source (`<source>.test.mjs` next to `<source>.mjs`) inherit the
source's prefix and are not separately scoped — the convention encodes runtime
role, and a test file is not an entry point.

| Prefix       | Role                  | Exit-code semantics                                                | Justification rubric                                           | Examples today                                   |
| :----------- | :-------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------- | :----------------------------------------------- |
| `check-*`    | Sensor / quality gate | Exit 0 = policy satisfied; exit ≠ 0 = policy violated (blocking).  | Catch frequency — must catch what existing layers let through. | `check-conventions`, `check-biome-rule-baseline` |
| `generate-*` | Transformer / build   | Exit 0 = output written; exit ≠ 0 = generation failed.             | Build correctness — pipeline needs the output or does not.     | `generate-csp-hashes`                            |
| `query-*`    | Read-only lookup      | Exit code signals runtime status only; finding count never blocks. | Usage frequency — repeated invocation pays for the tool.       | `query-sonar-findings` (renamed in the same PR)  |

The convention applies to the entry-point file under `scripts/` and to the
matching pnpm-script entry in `package.json`. Subdirectory module names under
`scripts/sonar-findings/`, `scripts/conventions/`, `scripts/biome-rules/` are
unaffected — those names encode endpoint or domain, not operation.

The single application this ADR ships in lockstep:

- `scripts/check-sonar-findings.mjs` → `scripts/query-sonar-findings.mjs`
- `scripts/check-sonar-findings.test.mjs` →
  `scripts/query-sonar-findings.test.mjs`
- `package.json` script `check:sonar-findings` → `query:sonar-findings`

The rename is performed with `git mv` so the renamed files inherit the prior
file history. ADR-0042, ADR-0045, and ADR-0046 carry path-string references that
migrate in lockstep; the **decisions** those ADRs record are unchanged. The
relationship to ADR-0042 is recorded as `Amends`, not `Supersedes` — ADR-0042's
decision (the agent-side SonarCloud findings query as the third local-prevention
layer) is intact in substance; only the filename and the pnpm-script name
change.

### When to add a new entry-point script

The architect's Phase-2 concept document classifies a proposed script into one
of the three roles before it is built. The classification step asks:

1. **Is the script a sensor (`check-*`)?** Then the concept records the observed
   bleed condition the script catches (a finding the existing prevention layers
   let through) and the rubric the script will be evaluated against (catch
   frequency).
2. **Is the script a transformer (`generate-*`)?** Then the concept records what
   the pipeline cannot do without the output.
3. **Is the script a lookup (`query-*`)?** Then the concept records the usage
   frequency the tool is expected to earn and the failure path that keeps the
   agent quality chain green on outages (exit-0 contract).

If none of the three apply cleanly, the architect surfaces that fact to the
project owner before naming the script. Silent default-classification (e.g.,
"call it `check-*` because the others are") is what produced the
`check-sonar-findings` defect; it is forbidden.

### What does NOT change

- The convention is review-enforced, not script-enforced. No new
  `check-script-naming.mjs` is added. The architect concept-phase classification
  step is the durable enforcement; the convention entry in `docs/CONVENTIONS.md`
  carries the rubric so the classification is reproducible.
- The four existing entry-point scripts are unchanged in behaviour. Only the
  filename and pnpm-script name of `check-sonar-findings` migrate.
- The `pnpm check` chain (`typecheck` → `lint` → `format:check` →
  `check:conventions`) is unchanged. The renamed `query:sonar-findings` remains
  opt-in and is never chained — ADR-0042's "lookup, not gate" stance is
  inherited unchanged.
- Subdirectory names under `scripts/` are unchanged. `scripts/sonar-findings/`,
  `scripts/conventions/`, `scripts/biome-rules/` are domain-named.
- ADR-0042's empirical-baseline table, hotspot extension, and branch-aware
  extension (recorded jointly with ADR-0046) are unchanged. ADR-0041's
  empirical-evidence table is unchanged. ADR-0045's pre-push jscpd gate is
  unchanged. ADR-0046's file-split layout under `scripts/sonar-findings/` is
  unchanged. Only the path strings that name the renamed entry-point script
  update.
- No directory restructure under `scripts/`. The four entry-points stay flat. A
  fifth, sixth, or seventh entry-point can land under the same flat layout
  before any directory-shape conversation has to happen; the prefix carries the
  role information that a `scripts/checks/` subdirectory would otherwise encode.

### Scope and non-goals

**In scope:**

- The three-prefix naming convention for entry-point scripts under `scripts/`.
- The pnpm-script-name mirroring (`check:*`, `generate:*`, `query:*`).
- The `check-sonar-findings` → `query-sonar-findings` rename and the in-lockstep
  update of every internal reference (test imports, runner docstrings, submodule
  cross-reference docstrings, captured test fixture, hotspots-test assertions,
  ADRs that reference the path, agent prompts, `.claude/settings.json`
  permission patterns, top-level docs).
- The classification step in the architect's Phase-2 concept for new entry-point
  scripts.

**Out of scope:**

- A `check-script-naming` sensor that lints filenames. The convention is small
  enough and the review surface is engaged enough that the script would be a
  sensor without a documented bleed condition — by its own rubric, it doesn't
  earn the build.
- Renaming subdirectories under `scripts/`. They are domain-named and
  unaffected.
- Restructuring `scripts/` into `scripts/checks/`, `scripts/tools/`,
  `scripts/build/`. Explicitly rejected in approach 2.
- Adding new sensors or transformers as part of this work. The convention is
  established here; future sensors land under the documented classification
  rubric, with their own bleed conditions.
- Re-litigating whether `query-sonar-findings` earns its maintenance burden.
  That question was answered yes prior to this ADR; this ADR codifies the answer
  in the script's name.

## Consequences

### Positive

- **Role-encoded filenames.** A maintainer or AI agent reading `package.json` or
  running `ls scripts/` infers each script's blocking-vs-informational nature
  without opening the file. The semantic bug that misled prior sessions is
  structurally closed.
- **Three justification rubrics, three role classes.** The catch-frequency /
  build-correctness / usage-frequency split documented in CONVENTIONS keeps the
  scoping conversation honest. A future "should we build this?" question routes
  to the rubric that matches the proposed role, not to a single rubric that is
  wrong for two of the three classes.
- **Discoverability for a replacement maintainer.** `scripts/query-*` says
  "lookup tool" the way `src/data/*` says "domain data" — the directory layout
  carries semantic load without a hidden convention.
- **Zero net code churn.** No new dependency, no new CI step, no new pnpm-script
  entry beyond the renamed one. The convention is documentation plus one rename.

### Negative

- **Review-time enforcement only.** A future maintainer can ignore the
  convention by adding a `tools-something.mjs` directly under `scripts/`, and CI
  won't catch it. Mitigation: the convention lives in CONVENTIONS.md where
  new-script PRs reach it during code review; the architect concept phase runs
  the classification step before a script is built; the burden is on review
  attention, not on a sensor that doesn't earn its build.
- **PR cross-reference scope.** The rename touches ADR-0042, ADR-0045, and
  ADR-0046, the `.claude/agents/implementer.md` verify-pass invocation,
  `.claude/settings.json` permission patterns, `CLAUDE.md`,
  `docs/ARCHITECTURE.md`'s ADR Quick Reference, `docs/CONVENTIONS.md`'s Topic
  Hub Index plus the new section, `docs/DEVELOPMENT.md`, `docs/MAINTENANCE.md`,
  `docs/reference/claude-permissions.md`, and a Phase-4 audit note under
  `docs/debt/`. The PR is documentation-heavy. Mitigation: the 3-commit split
  (ADR + CONVENTIONS first, code rename second, cross-reference sweep third)
  keeps each commit's review surface legible.
- **History continuity at the renamed file.** `git log --follow` continues to
  traverse the rename, but tooling that doesn't pass `--follow` (some blame
  queries, some GitHub UI views before the rename) sees a fresh history at the
  new path. Acceptable: the rename happens once, and the prior history is
  recoverable on demand.
- **Synthetic third-class identity.** A future reviewer skimming `package.json`
  sees `query:*` alongside `check:*` and may wonder whether the `query:` prefix
  is a project invention. It is. The convention entry in CONVENTIONS.md and this
  ADR are the canonical references; the prefix has no upstream tooling that owns
  it.

### Risk mitigation

- **Convention drift on the next script.** Mitigated by the architect's Phase-2
  classification step (called out in CONVENTIONS.md) and by the Topic Hub Index
  entry that routes a maintainer adding a script to the rubric before the file
  lands. If a script is named without the classification step, the review-phase
  reviewer (Phase 4) catches the omission and references this ADR.
- **Future role that none of the three prefixes captures.** The C-trigger in the
  Warrant Check above names this as an explicit revisit condition. A fourth
  prefix lands either via a successor ADR or as a documented extension of this
  one. Silent addition is forbidden by the same review attention that enforces
  the existing convention.

## Success criteria

- Every `.mjs` file directly under `scripts/` carries one of the three prefixes
  from the day this ADR lands. A `grep -nE "^scripts/[a-z]+-" -- scripts/*.mjs`
  returns only matches whose first token is `check`, `generate`, or `query`.
- A
  `git grep -n "check-sonar-findings\|check:sonar-findings" -- ':!docs/adr/0050-script-entry-point-naming-convention.md' ':!docs/CONVENTIONS.md'`
  over the repo returns zero hits after Commit 3 of the introducing PR. The two
  excluded paths carry the deliberate narrative that names the historical
  defect: this ADR (Context, rename tuples, disambiguation paragraphs, and the
  literal regex string above) and the matching sentence in `docs/CONVENTIONS.md`
  § Script Entry-Point Naming.
- A future entry-point script lands with an architect concept that names its
  role-class explicitly. The concept is rejected by the concept-reviewer if the
  classification step is missing.

## Documentation Updates

This ADR requires updates to the following documents in the same PR that
introduces it. The architect lists them here; the implementer makes the updates
as part of the three-commit plan.

**Updates required by this ADR:**

- [`docs/CONVENTIONS.md`](../CONVENTIONS.md) — new top-level section **"Script
  Entry-Point Naming"** carrying the three-prefix table, the three justification
  rubrics (catch frequency / build correctness / usage frequency), the explicit
  subdirectory carve-out, the architect-phase classification step, and a link to
  this ADR. Commit 1.
- [`docs/CONVENTIONS.md#topic-hub-index`](../CONVENTIONS.md#topic-hub-index) —
  new bullet "When adding a new entry-point script under `scripts/`" with
  pointer to the new section and to this ADR. Commit 1.
- [`docs/ARCHITECTURE.md#adr-quick-reference`](../ARCHITECTURE.md#adr-quick-reference)
  — new row for ADR-0050. Commit 1.
- [`CLAUDE.md` § Conventions Quick Reference](../../CLAUDE.md#conventions-quick-reference)
  — one bullet "**Scripts entry-points**: `check-*` sensor, `generate-*`
  transformer, `query-*` lookup; pnpm-script names mirror the prefix (see
  CONVENTIONS.md § Script Entry-Point Naming, ADR-0050)". Commit 1.
- `package.json` — pnpm-script rename `check:sonar-findings` →
  `query:sonar-findings`. Commit 2.
- `scripts/check-sonar-findings.mjs` → `scripts/query-sonar-findings.mjs`
  (`git mv`) with docstring self-reference updates at lines 22-25, 44, 296
  (HELP_TEXT), and 1401. Commit 2.
- `scripts/check-sonar-findings.test.mjs` →
  `scripts/query-sonar-findings.test.mjs` (`git mv`) with the test-import line 5
  update. Commit 2.
- `scripts/sonar-findings/duplications.mjs`,
  `scripts/sonar-findings/hotspots.mjs`, `scripts/sonar-findings/issues.mjs`,
  `scripts/sonar-findings/query.mjs` — cross-reference docstrings (two hits per
  file). Commit 2.
- `scripts/sonar-findings/fixtures/hotspots-response.json` — five string
  occurrences in `component`/`path`/`name`/`longName` fields. Commit 2.
- `scripts/sonar-findings/hotspots.test.mjs` — string assertions at lines 113,
  134, 212. Commit 2.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) carries the bulk of
  the path references (lines 52, 81, 97, 99, 122, 127, 180, 237, 260, 319, 355,
  367, 449, 450, 483). [ADR-0045](0045-local-jscpd-duplication-gate.md) carries
  seven path references (lines 26, 143, 158, 172, 215, 234, 282).
  [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
  carries sixteen path references; all migrate. Commit 3.
- [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md) — § "Agent-Side Findings Query"
  command examples at lines 596, 662, 714, 728, 731, 734, 737, 740, 743, 764,
  767, 788, 791, 841. Commit 3.
- [`docs/MAINTENANCE.md`](../MAINTENANCE.md) — command example at line 364.
  Commit 3.
- [`docs/reference/claude-permissions.md`](../reference/claude-permissions.md) —
  script-name listing at line 287. Commit 3.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — row for ADR-0042 at line 471
  (path-string update inside the existing cell). Commit 3.
- [`docs/debt/audit-2026-05-09-sonar-duplications-metric-review.md`](../debt/audit-2026-05-09-sonar-duplications-metric-review.md)
  — seven path-string references; this is a Phase-4 audit note that survived the
  worktree cleanup intentionally, so its path strings reflect the contemporary
  file naming and must update too. Commit 3.
- [`.claude/agents/implementer.md`](../../.claude/agents/implementer.md) —
  Verify Pass Before Handoff command at line 298. Commit 3.
- [`.claude/settings.json`](../../.claude/settings.json) — bash-permission
  patterns at lines 16-17 (`Bash(pnpm check:sonar-findings)` and
  `Bash(pnpm check:sonar-findings *)` migrate to
  `Bash(pnpm query:sonar-findings)` and `Bash(pnpm query:sonar-findings *)`).
  The pnpm matcher splits per-script, so the new entries are required for the
  new script name to be auto-allowed. Commit 3.

**Checked and deliberately not updated:**

- [`docs/adr/0030-csp-strategy.md`](0030-csp-strategy.md) and
  [`docs/adr/0031-migration-to-native-view-transitions.md`](0031-migration-to-native-view-transitions.md)
  — `files_with_matches` flagged these as candidates, but a content grep for
  `check-sonar-findings` / `check:sonar-findings` against each file returned
  zero hits. The earlier match was spurious. No update needed.
- [`docs/adr/0041-sonarlint-connected-mode-local-prevention.md`](0041-sonarlint-connected-mode-local-prevention.md)
  — `files_with_matches` flagged this as a candidate, but a content grep for
  `check-sonar-findings` / `check:sonar-findings` against this file returned
  zero hits. The earlier match was spurious. No update needed.
- `CONTRIBUTING.md` — no path or pnpm-script-name references to the renamed
  surface. Commit, branch, and PR workflow are unaffected.
- Topic Hub Index in CONVENTIONS.md is already maintained in lockstep with ADR
  additions; the new bullet lands with Commit 1 alongside the new section.

## References

- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — primary
  local-prevention layer that this ADR's `check-*` taxonomy builds on; the
  empirical-evidence table there is unchanged by this rename.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — the agent-side
  findings query whose CLI entry script this ADR renames. Relationship recorded
  as `Amends`: ADR-0042's decision is intact in substance; only the path strings
  and the pnpm-script-name string change. Path string updates in Commit 3.
- [ADR-0045](0045-local-jscpd-duplication-gate.md) — pre-push jscpd duplication
  gate; references the renamed script in its forward-pointer and Scope/Related
  sections. Path string updates in Commit 3.
- [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
  — branch-aware extension and file-split under `scripts/sonar-findings/`;
  sixteen path-string references to the renamed entry script. Path string
  updates in Commit 3.
- `scripts/check-conventions.mjs` — canonical example of the `check-*` role
  (true sensor, blocking exit code, chained into `pnpm check`).
- `scripts/check-biome-rule-baseline.mjs` — second canonical `check-*` example
  (CI canary, blocking on rule-existence drift against the pinned Biome binary).
- `scripts/generate-csp-hashes.mjs` — canonical example of the `generate-*` role
  (post-build transformer the pipeline depends on).
- `scripts/query-sonar-findings.mjs` (post-rename) — canonical example of the
  `query-*` role (lookup-only, exit-0 on every successful or transient-failure
  path).
- `docs/CONVENTIONS.md` § Script Entry-Point Naming — the convention entry that
  this ADR's substance lives in. The new section is added in Commit 1.
