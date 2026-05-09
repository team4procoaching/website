# SonarCloud Branch-Aware Findings, Duplications Extension, and `scripts/sonar-findings/` File Split

Date: 2026-05-07

## ADR Warrant Check

- [x] **A — Contract**: this ADR creates three contracts that contributors and
      AI-assisted edits must honour. First, every `pnpm check:sonar-findings`
      query (issues, hotspots, duplications, and the duplications-supporting
      measures pre-fetch) is scoped to the **current local branch** by threading
      `?branch=<branchName>` (or `?pullRequest=<n>` when a PR axis is supplied)
      through every URL builder; consumers no longer see default-branch results
      when running on a feature branch. Second, the `scripts/sonar-findings/`
      directory hosts one file per SonarCloud endpoint (`issues.mjs`,
      `hotspots.mjs`, `duplications.mjs`) plus the shared infrastructure file
      (`query.mjs`); a fourth endpoint extension lands as a fourth sibling file,
      not as another inline section in any of the existing four. Third, the
      chained-fetch pattern documented below (measures pre-fetch only on
      `--all`, per-file `duplications/show` on every other path) is the
      canonical shape for any future endpoint that requires per-component
      scoping where the project-wide candidate set is not known up front.
- [x] **B — Asymmetry**: this ADR adds the duplications endpoint at a structural
      shape that is asymmetric with the existing issues and hotspots endpoints
      on five axes: cache key (per-component, not per-file-set), fetch shape
      (chained on `--all`, single per file otherwise), finding identity
      (synthetic rule key `sonarcloud:duplicated-block`, not a SonarCloud-side
      rule registry entry), branch-axis fallback semantics (HTTP 404 on
      unanalysed branches, in contrast to issues' silent
      HTTP-200-with-empty-list fallback — see Behaviour), and cluster topology
      (block partners can be intra-file regions of the queried component, not
      necessarily cross-file). The asymmetries are necessary because the
      SonarCloud `/api/duplications/show` endpoint accepts only a single
      component per call and reports clusters at block granularity, which
      neither `/api/issues/search` nor `/api/hotspots/search` does. The ADR
      records the asymmetries so a future contributor reading the three endpoint
      files does not normalise them in the wrong direction.
- [x] **C — External revisit**: the SonarCloud Web API is the external surface
      this ADR consumes. A future SonarSource schema change to
      `/api/duplications/show`, `/api/measures/component_tree`, or the
      branch-axis behaviour of `/api/issues/search` / `/api/hotspots/search`
      triggers a revisit. The captured fixtures at the test-time snapshot are
      the falsifiable record against which a future divergence is detected.

## Status

Accepted

## Context

[ADR-0042](0042-agent-side-sonarcloud-findings-query.md) established the
agent-side SonarCloud findings query as the third local-prevention layer and
added an inline Hotspot extension closing the security-hotspot blind spot. The
same ADR named a flip-point criterion: "If a third endpoint extension lands
(e.g. `/api/measures` or `/api/coverage`), the URL builder / response parser /
finding mapper triplet for each endpoint moves to its own
`scripts/sonar-findings/<endpoint>.mjs` file; shared utilities (cache, error
classifier, formatter scaffolding,
`buildMeta`/`compareFindings`/`parseConnectedMode`) stay in `query.mjs`."

[ADR-0045](0045-local-jscpd-duplication-gate.md) added the local pre-push jscpd
gate as the fourth local-prevention layer. The same ADR named the post-push
parity surface ("the complementary post-push surface — extending
`pnpm check:sonar-findings` with a duplications metric — is the
structurally-aligned mechanism for catching SonarCloud-flagged duplications the
local gate misses by design") and recorded the work as a follow-up that would
extend ADR-0042, not ADR-0045.

This ADR closes that follow-up. Three structurally new questions surface that
ADR-0042's Hotspot extension did not have to answer:

1. **Endpoint shape.** The SonarCloud REST surface for duplications is split
   across two endpoints. `/api/duplications/show?key=<componentKey>` returns the
   cluster + block-location data the operator needs to act on a finding, but
   accepts only one component per call.
   `/api/measures/component_tree?metricKeys=duplicated_lines` returns per-file
   aggregate metrics across a project subtree but no block locations. Neither
   endpoint alone covers the agent's stated goal ("file paths plus
   duplicated-block locations for the touched file set"); the shape that does
   cover it is a chained fetch where the measures call narrows the per-file
   iteration only when the iteration is otherwise unbounded (`--all`). The
   default touched-file-set case skips the measures call entirely.

2. **Cache-key shape.** `/api/duplications/show` returns one response per
   component, not one response per file-set tuple. Caching by file- set (the
   existing issues/hotspots shape) would miss every overlap between two
   invocations that share most-but-not-all of the file set. Caching by component
   matches the endpoint's shape and gives a strict cache-hit improvement.

3. **Branch axis.** The verify-pass invocation runs on a feature branch the
   agent has not necessarily pushed yet. Without `?branch=<branchName>` (or
   `?pullRequest=<n>`), every existing query (issues, hotspots, and now
   duplications) silently reports the default-branch view, even when the current
   branch is several commits ahead. For an automated contributor whose
   verify-pass is meant to surface "did **this branch's** changes introduce new
   findings", that is a false-negative on the most-frequent use case. The branch
   axis was an unstated assumption in ADR-0042; the duplications extension
   forced the question and the answer applies uniformly to all three endpoints.

The decision this ADR closes: **what is the structural shape of the duplications
extension, what does that shape mean for the layout of
`scripts/sonar-findings/`, and how does the runner scope every query to the
current branch consistently?**

### Decision drivers

- **AI-first working mode.** The post-push duplications question is asked at
  AI-iteration cadence, not human-iteration cadence. Round-trip economy on the
  default invocation matters more than implementation symmetry with the
  issues/hotspots paths. Equally, the branch-axis question is asked on every
  verify-pass, so getting it wrong is a recurring cost.
- **Per-file cache-hit ergonomics.** The duplications endpoint's per-component
  shape makes per-file cache keys structurally available. Declining the
  improvement to preserve symmetry with two endpoints that did not have the
  option is symmetry-for-symmetry's-sake.
- **Bus factor.** The ADR-0042 flip-point exists precisely so that a future
  contributor reading `query.mjs` at 1100+ LoC does not have a worse on-ramp
  than reading a focused `duplications.mjs`. Firing the flip-point on the
  trigger ADR-0042 named is a contract honour, not a cosmetic preference.
- **No paid SaaS, no new CI credit cost.** The script remains a local read-only
  lookup against SonarCloud's public REST API. Inherited unchanged from
  ADR-0042.
- **`pnpm check` chain unchanged.** Inherited from ADR-0041 / ADR-0042 /
  ADR-0045. The new flag `--include-duplications` is opt-in on the existing
  sibling script, not a new chain entry. Branch-awareness is not a new flag; it
  is an unconditional URL-parameter addition on the existing flags.

### Evaluated approaches

1. **Per-file `/api/duplications/show` with measures pre-fetch only on `--all`.
   Branch axis added uniformly to all three endpoints. Chosen.** The default and
   `--files` paths skip the measures call (the file set is already known). The
   `--all` path issues one (paginated) measures call to identify
   files-with-duplications, then iterates `duplications/show` over that subset.
   Per-file cache keys, with the branch name folded into every key. Branch axis
   is unconditional — the runner always passes `?branch=<currentBranch>` (or
   `?pullRequest=<n>`) on every endpoint.
2. **`/api/measures/component_tree` always, then chained `duplications/show`.**
   Rejected: the extra measures call on the default small-N case is at best a
   wash and at worst a regression. `measures/component_tree` filtered to a list
   of components requires client-side filtering of the whole tree response —
   more bytes-on-wire than the per-file `duplications/show` shape this approach
   optimises against.
3. **Inline the new endpoint logic in `query.mjs`, defer the file-split.**
   Rejected: ADR-0042 explicitly named the third-endpoint trigger as the
   flip-point. Deferring violates the contract ADR-0042 set; the future refactor
   PR carrying only the file-split has no behavioural anchor for reviewers to
   evaluate the move against.
4. **Branch axis only on duplications; leave issues+hotspots
   default-branch-scoped.** Rejected: the verify-pass invocation runs all three
   paths together. Reporting branch-scoped duplications alongside
   default-branch-scoped issues is a worse contract than the current
   uniformly-default-branch state — users would have to remember which class is
   branch-aware. Once the branch axis is added to one endpoint, the symmetric
   expectation applies to all three.

## Decision

The `pnpm check:sonar-findings` runner gains a new opt-in flag
`--include-duplications`. When set, the runner additionally fetches SonarCloud
duplications findings for the same project + file scope as the issues path,
surfaces them under a `Duplicated Blocks:` section in pretty mode and a
top-level `duplications: [...]` array in JSON mode, exits 0 on every successful
or transient-failure path, and applies the chained-fetch + per-file-cache shape
documented below.

Every URL the runner builds against SonarCloud — issues, hotspots, duplications,
and the duplications-supporting measures pre-fetch — is scoped to the current
branch via `?branch=<branchName>` when running on a regular branch, or
`?pullRequest=<n>` when a PR-axis flag is supplied (see Behaviour for the branch
resolution and the `--pull-request` flag).

The `scripts/sonar-findings/` directory splits into one file per SonarCloud
endpoint plus a shared-infrastructure file. The split executes ADR-0042's
third-endpoint flip-point.

Load-bearing values fixed by this ADR:

- **New flag:** `--include-duplications`, opt-in, default off, symmetric to
  `--include-hotspots`. The implementer's verify-pass invocation in
  `.claude/agents/implementer.md` is updated in lockstep so the agent contract
  surfaces all three finding classes by default.
- **New flag:** `--pull-request=<n>`, opt-in. When present, every URL uses
  `?pullRequest=<n>` instead of `?branch=<branchName>`. Mutually exclusive with
  `--branch=<name>` and with the implicit current-branch resolution. When
  absent, the runner resolves the axis via `currentBranch(runGit)` already
  present in `scripts/check-sonar-findings.mjs`. Passing both `--branch=<name>`
  and `--pull-request=<n>` together is a usage error and exits with status 2
  (the script's existing `runMain` convention for argv-parsing failures,
  verified at `scripts/check-sonar-findings.mjs:881`; distinct from the
  API-failure exit-0 semantics inherited from ADR-0042).
- **Endpoint shape:** chained
  `/api/measures/component_tree?metricKeys=duplicated_lines&qualifiers=FIL`
  - per-file `/api/duplications/show?key=<componentKey>` on `--all`; per-file
    `/api/duplications/show?key=<componentKey>` only on default and `--files`
    paths. Each call carries the current branch axis.
- **Synthetic rule key:** `sonarcloud:duplicated-block`. The SonarCloud
  duplications-metric does not surface a rule registry entry comparable to
  `typescript:S1234`; the metric reports under `common-js:DuplicatedBlocks` /
  `common-ts:DuplicatedBlocks` per language. The synthetic key with the
  `sonarcloud:` prefix is a deliberate fiction signalling that the agent surface
  adds an identifier the SonarCloud rule registry does not. A future contributor
  grepping the synthetic key in `duplications.mjs` finds this ADR within one
  cross-reference hop.
- **Cache-key shapes:** all keys gain a leading `branchAxis` segment so cache
  entries from different branches do not collide. Discriminator literals on
  `cacheKeyOf({ endpoint, ... })`:
  - `'issues::<branchAxis>::<sortedFiles>::<statuses>::<pageSize>'`
  - `'hotspots::<branchAxis>::<sortedFiles>::<pageSize>'`
  - `'duplications::<branchAxis>::<componentKey>'` (one entry per file)
  - `'measures-tree::<branchAxis>::<projectKey>::<metricKeys>'` (one entry per
    project + metric tuple)

  Where `<branchAxis>` encodes either `branch:<name>` or `pullRequest:<n>`,
  formed by `cacheKeyOf` from a discriminated-union input. The shape of the
  input changes — see "Shared-utility contract changes" below — but the on-disk
  wrapper shape (`{ schemaVersion, entries }`) is unchanged.
  `CACHE_SCHEMA_VERSION` **is** bumped from 2 to 3 because cache entries written
  under v2 (which had no branch axis) would silently surface under the wrong
  branch on read; the bump-and-discard flow already in `parseCacheEntry` handles
  the migration with one extra fetch per cache entry on first run.

- **JSON envelope additivity:** `meta.schemaVersion` stays at 1.
  `meta.snapshotInfo.duplicationsIncluded` is added as a sibling to
  `hotspotsIncluded`. `meta.snapshotInfo.branch` already carried the resolved
  name; gains a sibling `pullRequest: number | null` (null unless
  `--pull-request=<n>` was passed). The top-level `duplications: [...]` array is
  present iff `duplicationsIncluded` is true, mirroring the `hotspots: [...]`
  conditionality. Consumers that ignore unknown fields per standard
  JSON-handling norm are unaffected.

  Under `--pull-request=<n>`, `meta.snapshotInfo.branch` continues to hold the
  resolved current local branch name — the value returned by
  `currentBranch(runGit)` (or supplied via `--branch=<override>`) at the time of
  the call. The PR id surfaces on the new sibling `pullRequest: number | null`
  field; `branch` is **not** nulled out and is **not** replaced by a
  `pull-request:<n>` sentinel string. The choice is structurally cheap (the
  runner's `runMain` resolution flow already has the local branch name in hand
  from line 892's `currentBranch(runGit)` call, regardless of whether the URL
  builders consume it) and preserves the additivity property: `branch: string`
  (non-nullable) per the existing JSDoc on `buildMeta` is unchanged, so no
  consumer relying on `branch.length` or `branch.includes(...)` crashes when the
  PR axis is in effect. `pullRequest`, not `branch`, is the axis disambiguator a
  JSON-envelope consumer reads to know which axis the data was scoped to. The
  detached-HEAD-with-override edge case (see Behaviour § Branch resolution)
  follows the same rule: `branch` holds whatever `currentBranch` returned
  (`'detached@<sha>'` with `isDetached: true`), and `pullRequest` carries the
  supplied id.

- **File layout post-split:**
  - `scripts/sonar-findings/query.mjs` — shared infrastructure:
    `parseConnectedMode`, `cacheKeyOf`, `isCacheFresh`, `parseCacheEntry`,
    `classifyDiffEdgeCase`, `classifyError`, `compareFindings`, `buildMeta`,
    `formatPretty`, `formatJson`, the section-formatter helpers
    (`appendHotspotSection`, `appendDuplicationsSection`), and the shared
    constants `SONARCLOUD_BASE_URL`, `DEFAULT_CACHE_TTL_MS`,
    `CACHE_SCHEMA_VERSION`, `SCHEMA_VERSION`.
  - `scripts/sonar-findings/issues.mjs` — `buildIssuesUrl`,
    `parseIssuesResponse`, `mapIssueToFinding`, `DEFAULT_ISSUES_PAGE_SIZE`
    (renamed from the legacy `DEFAULT_PAGE_SIZE` for symmetry with the hotspots
    constant), `DEFAULT_STATUSES`.
  - `scripts/sonar-findings/hotspots.mjs` — `buildHotspotsUrl`,
    `parseHotspotsResponse`, `mapHotspotToFinding`,
    `filterHotspotsByDefaultStatus`, `DEFAULT_HOTSPOT_LIFECYCLE_STATUSES`,
    `DEFAULT_HOTSPOTS_PAGE_SIZE`.
  - `scripts/sonar-findings/duplications.mjs` — `buildDuplicationsShowUrl`,
    `buildMeasuresComponentTreeUrl`, `parseDuplicationsShowResponse`,
    `parseMeasuresComponentTreeResponse`, `mapDuplicationToFindings`,
    `dedupeDuplicationFindings`, `DUPLICATIONS_RULE_KEY`,
    `DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE`,
    `MEASURES_COMPONENT_TREE_HARD_CAP_PAGES`.
  - `scripts/check-sonar-findings.mjs` — I/O wiring; gains
    `fetchAndCollectDuplications` orchestrator parallel to
    `fetchAndFilterHotspots`; gains the `--pull-request=<n>` argv branch and
    threads the resolved branch axis into every URL builder and cache-key call.

### Shared-utility contract changes

The branch-aware extension forces a real signature change on `cacheKeyOf` and on
the URL builders the existing endpoints already own. The change is recorded
here, not silently bundled into the file- split commits.

- **`cacheKeyOf` signature.** Pre-existing input shape was
  `{ endpoint: 'issues' | 'hotspots', files, statuses?, pageSize }`. Post-split
  shape is a discriminated union over four `endpoint` literals (`'issues'`,
  `'hotspots'`, `'duplications'`, `'measures-tree'`), each carrying a
  `branchAxis` field of type
  `{ kind: 'branch', name: string } | { kind: 'pullRequest', id: string }`. The
  `branchAxis` participates in every key shape (folded after the endpoint
  literal, before the per-endpoint segments). The function stays in `query.mjs`
  because the discriminator-based collision guard is the structural property
  that justifies one shared cache file — splitting cache-key formation into
  per-endpoint helpers would duplicate the prefix-join logic three times and
  lose the central collision-guard property.
- **Endpoint coupling note.** `query.mjs`'s "shared infrastructure" framing has
  one allowed coupling: the `endpoint` discriminator literal in `cacheKeyOf` and
  the section-formatter helpers (`appendHotspotSection`,
  `appendDuplicationsSection`) which know the per-endpoint finding-shape JSDoc.
  This is deliberate. The orchestrator (`formatPretty`, `formatJson`) owns the
  section-stacking order; having it dispatch to per-endpoint files for section
  formatting would invert the dependency direction and turn the shared layer
  into a router. Per-endpoint files own their URL/parser/mapper triplet (the
  canonical ADR-0042 layout); section formatters and the cache- key
  discriminator stay shared.

  The strongest counter to this arrangement is the two-file-edit cost it imposes
  on every future endpoint addition: a hypothetical fifth endpoint requires
  editing both `<fifth>.mjs` (for the URL builder, parser, and mapper) **and**
  `query.mjs` (for `appendFifthSection` plus the `formatPretty` / `formatJson`
  import that drives the section-stacking order). That is two files per
  endpoint, not one, and the dependency-direction argument above does not refute
  it — the endpoint files own their finding shape, and the section formatter is
  a function of that shape, so a "formatters-with-shapes" arrangement is
  structurally defensible. We accept the cost consciously: section-stacking
  order is a non-negotiable shared concern (the orchestrator must emit issues,
  then hotspots, then duplications in fixed order regardless of how each section
  is rendered), and the collision-guard analogy from `cacheKeyOf` does not apply
  here — section formatters do not interact across endpoints (each one writes to
  a separate region of the output buffer), so duplicating the section-formatter
  call sites by moving them to per-endpoint files would not introduce a
  collision-guard property worth the move. The two-file-edit cost is paid in
  exchange for keeping the section-stacking order in one place.

- **`buildIssuesUrl` and `buildHotspotsUrl` signatures.** Both gain a required
  `branchAxis` field (same shape as `cacheKeyOf`'s input). The runner threads
  the resolved axis at the call site; URL builders emit either
  `&branch=<encoded>` or `&pullRequest=<id>`. The legacy call without the axis
  is removed; existing tests gain `branchAxis` in their setup, mirroring how
  `--include-hotspots` extended its tests in PR #186.

### Behaviour

- **Default file set.** Inherits ADR-0042's resolution
  (`git diff --name-only main...HEAD` plus `--files`/`--all` overrides).
- **Branch resolution.** When neither `--branch` nor `--pull-request` is passed,
  the runner uses `currentBranch(runGit)` (already present in
  `scripts/check-sonar-findings.mjs`) to derive
  `{ kind: 'branch', name: <localName> }`. When `--branch=<name>` is passed, it
  overrides the local resolution. When `--pull-request=<n>` is passed, the axis
  becomes `{ kind: 'pullRequest', id: <n> }` and `--branch` may not be combined.
  On a detached HEAD (where `currentBranch` returns
  `branch: 'detached@<sha>', isDetached: true`), the runner emits a warning and
  short-circuits to no-fetch / `(no findings)` — SonarCloud has no notion of a
  detached-SHA query. An explicit `--branch=<name>` or `--pull-request=<n>` flag
  overrides the detached-HEAD short-circuit and queries the supplied axis; the
  override flags exist precisely for the contexts where `currentBranch` returns
  nothing useful (CI ephemeral checkouts, post-rebase verification,
  `git worktree add <sha>` results where no branch ref is attached).
- **Per-file iteration (duplications).** For each file in the resolved set, the
  duplications path issues
  `GET /api/duplications/show?key=<projectKey>:<file>&branch=<currentBranch>`
  (or `&pullRequest=<n>`). The verified response shape is
  `{ duplications: [{ blocks: [{ from, size, _ref }, ...] }, ...], files: { [refKey]: { key, name, uuid, project, projectUuid, projectName } } }`,
  where `_ref` is a string and `files` is keyed by those `_ref` strings. Each
  cluster is mapped to one finding per block whose `_ref` resolves to a file in
  the resolved set. **Block partners can be intra-file regions of the same
  component** (verified empirically on this project: every observed cluster had
  all blocks pointing at the same `_ref` as the queried key — the cluster spans
  two regions of a single file). Cross-file partners (different `_ref`) are
  possible per the API contract; the parser handles both topologies uniformly.
  Cross-file partners outside the resolved file set are named in the finding
  message ("duplicated with `<otherFile>`") but do not generate their own
  findings unless that partner file is in the resolved set.
- **`--all` short-circuit (duplications).** When `--all` is set, the
  duplications path first issues
  `GET /api/measures/component_tree?component=<projectKey>&metricKeys=duplicated_lines&qualifiers=FIL&ps=500&p=<n>&branch=<currentBranch>`,
  paginating through `paging.total` pages with a hard cap at
  `MEASURES_COMPONENT_TREE_HARD_CAP_PAGES = 10` (i.e. 5000 components, far above
  this project's current ~110-component count). The pagination loop reads
  `paging.total` from the first response and derives the page count
  `ceil(total / ps)`; a `paging.total` exceeding the hard cap emits a warning
  naming the truncation and proceeds with the pages fetched so far (best-effort,
  exit 0). The response reports `measures[].value` as a **string** (verified:
  `"160"`, `"114"`, etc., not `160`, `114`); the parser coerces with
  `Number(value)` and treats `bestValue: true` (which the API also emits when
  `value === "0"`) as the canonical "no duplications" signal. Filters to
  components with `duplicated_lines > 0`, then iterates `duplications/show` over
  that subset. Without the pre-fetch, `--all` against this project's ~110 source
  files would issue one round-trip per file, most returning empty
  `{ duplications: [] }` — wasteful network use that the measures pre-fetch
  avoids.
- **Deduplication.** Multiple `duplications/show` responses can surface the same
  cluster if the touched file set contains multiple files in the same cross-file
  cluster. The orchestrator deduplicates findings by `(file, fromLine, size)`
  after collection. The dedup contract was validated against the captured
  fixtures: blocks within a single cluster have distinct `(from, size)` tuples,
  and the same block surfacing from two different `duplications/show` queries
  (when both source files happen to be in a cross-file cluster the agent
  touched) is the only case the dedup helper exists to collapse.
- **Synthetic rule key.** Each finding carries
  `rule = 'sonarcloud:duplicated-block'`. The pretty-print and JSON output
  surfaces use this key consistently; consumers can filter or group by it like
  any other rule.
- **Best-effort failure semantics.** Any per-file `duplications/show` failure
  (HTTP 4xx/5xx, network error, schema-drifted cached payload) collapses to that
  file's contribution being empty plus a warning, exit 0. The measures pre-fetch
  failure on `--all` collapses to an empty duplications array plus a warning.
  The issues path remains unaffected. Mirrors ADR-0042's "informational not
  gate" stance.
- **Branch-axis fallback semantics.** Empirical capture against the live
  SonarCloud API on a known-unanalysed branch and a known-bogus pull-request id
  produces:
  - `/api/duplications/show?branch=<unanalysed>` → **HTTP 404** with
    `errors[].msg = "Component '<key>' on branch '<branch>' not found"`.
  - `/api/measures/component_tree?branch=<unanalysed>` → **HTTP 404** with the
    analogous message naming the project component.
  - `/api/hotspots/search?branch=<unanalysed>` → **HTTP 404** with
    `errors[].msg = "Project '<key>' doesn't exist"` (the message text is
    misleading; the project does exist on the default branch but not on the
    queried branch).
  - `/api/issues/search?branch=<unanalysed>` → **HTTP 200** with
    `paging.total: 0, issues: []`.
  - `/api/duplications/show?pullRequest=<bogus>` → **HTTP 404**.
  - `/api/issues/search?pullRequest=<bogus>` → **HTTP 200** with empty list.
  - `/api/hotspots/search?pullRequest=<bogus>` → **HTTP 404** with
    `errors[].msg = "Project '<key>' doesn't exist"` — the same body shape the
    branch-axis arm returns. Captured 2026-05-08 in
    `.claude/tmp/sonar-duplications-shape-probe/branch-probe-hotspots-pr-bogus.json`.
    Hotspots are 404-on-no-data on **both** the branch and the PR axis; the
    symmetry holds asymmetrically (hotspots and issues do not agree on the
    no-data shape, but each endpoint behaves the same way across both axes).

  The asymmetry (issues 200/empty, duplications/measures/hotspots 404) is a
  SonarCloud server behaviour the runner cannot smooth over without
  misrepresentation. The `classifyError` function gains a branch-aware 404 row:
  when an HTTP 404 carries a body whose `errors[].msg` matches
  `/'<branch>'\s+not found/` or `/Project '<key>' doesn't exist/i`, the
  classification reports a warning
  (`"branch '<branch>' has not been analysed by SonarCloud yet (HTTP 404); push the branch and wait for analysis"`)
  instead of the existing "project not found" stderr. The
  `Project '<key>' doesn't exist` arm covers both
  `/api/hotspots/search?branch=<...>` and
  `/api/hotspots/search?pullRequest=<...>` since the captures show the body text
  is identical across the two axes — no hotspots-PR-specific arm is required.
  `allowStaleCache: false` on the branch-404 path because cached data from a
  different branch is by definition wrong. Exit 0 is preserved (informational
  not gate).

  **Wire-form note.** On the wire the apostrophes arrive JSON-escaped as
  `\u0027`, not as raw U+0027 characters — the verbatim hotspots body from a
  live `?branch=<unanalysed>` query is
  `{"errors":[{"msg":"Project \u0027<key>\u0027 doesn\u0027t exist"}]}`, and the
  duplications/measures bodies use the analogous `\u0027` encoding around the
  component and branch identifiers. The matcher therefore parses the JSON
  envelope first and applies the regex to the decoded `errors[].msg` text (where
  `\u0027` decodes back to `'`), with a raw-body regex fallback for payloads
  that fail to parse. The fallback is what carries the unit-test fixtures that
  use literal apostrophes in `JSON.stringify` output — `JSON.stringify` does not
  escape apostrophes by default, so the test bodies and the live wire bodies
  require the two matching paths in tandem.

- **Schema-drift cache contract.** Schema-drifted cached payloads (a cached
  `duplications/show` payload that no longer satisfies the strict parser)
  collapse to exit 0 with a warning, exercising the same defensive-parse
  contract the issues and hotspots paths already honour.
- **Banner.** The pretty-print banner gains a parenthetical when
  `--pull-request=<n>` is in effect: `... on pull request #<n>` instead of
  `... on branch <name>`. The `Duplicated Blocks:` section header (with
  `(no duplications)` empty state) appears below the `Security Hotspots:`
  section when `--include-duplications` is set, mirroring the section-stacking
  pattern the Hotspot extension established.

### Endpoint asymmetry vs. Issues + Hotspots

The duplications endpoint diverges from the existing two endpoints on five axes
that look like they should be symmetrical:

- **Component scoping.** Issues use
  `componentKeys=<projectKey>:<filepath>,<projectKey>:<filepath>,...`
  (multi-file in one call); hotspots use `files=<filepath>,<filepath>,...`
  (multi-file in one call); duplications use `key=<projectKey>:<filepath>`
  (single file per call). The endpoint accepts neither `keys=` nor a
  multi-component variant. Per-file iteration is the only shape.
- **Cache axis.** Issues key by `(branchAxis, files, statuses, pageSize)`;
  hotspots key by `(branchAxis, files, pageSize)`; duplications key by
  `(branchAxis, componentKey)` — one entry per file, not per file-set. The
  `cacheKeyOf` discriminator switches on the `endpoint` literal as before.
- **Finding identity.** Issues carry SonarCloud rule keys (`typescript:S1234`);
  hotspots carry SonarCloud rule keys (`javascript:S5852`); duplications carry
  the synthetic `sonarcloud:duplicated-block` key. The synthetic key is the only
  shape that does not multi-namespace per language (the underlying
  `common-js:DuplicatedBlocks` / `common-ts:DuplicatedBlocks` rules would
  mis-categorise cross-language clusters).
- **Section header in pretty mode.** Issues have no header (the default-table is
  the issues section); hotspots use `Security Hotspots:`; duplications use
  `Duplicated Blocks:`. The format-orchestrator stacks them in fixed order:
  issues table, then hotspots section if included, then duplications section if
  included.
- **Branch-axis fallback.** Issues' silent HTTP-200-with-empty-list on an
  unanalysed branch is the only endpoint that does not 404 in that case; the
  other three (duplications, measures, hotspots) all return HTTP 404 on both the
  branch and the PR axes. The hotspots endpoint specifically returns the same
  `Project '<key>' doesn't exist` body shape under both `?branch=<unanalysed>`
  and `?pullRequest=<bogus>` (verified 2026-05-08; see Behaviour). The runner
  treats the asymmetry by surfacing the same warning text on all three
  endpoints' 404 paths, but the trap is the asymmetry itself: a future
  contributor expecting all four endpoints to behave the same will be surprised.
  The asymmetry is recorded here.

A trap-comment in `duplications.mjs` documents these asymmetries so a future
contributor reading the three endpoint files does not normalise them in the
wrong direction. The comment is dated, links to this ADR section, and cites the
empirical captures under `.claude/tmp/sonar-duplications-shape-probe/`
(specifically `branch-probe-issues-bogus.json`,
`branch-probe-issues-pr-bogus.json`, `branch-probe-duplications-pr-bogus.json`,
`branch-probe-hotspots-bogus.json`, and `branch-probe-hotspots-pr-bogus.json`).

### Threshold-stability contract

Five values are fixed by this ADR; changing any of them requires explicit owner
sign-off and a Status update on this ADR (or a successor ADR):

- **Synthetic rule key:** `sonarcloud:duplicated-block`. Changing the string
  changes the agent contract for consumers filtering or grouping by rule.
- **Default measures metric set:** `duplicated_lines`. The endpoint also accepts
  `duplicated_blocks`, `duplicated_files`, `new_duplicated_lines`, and the
  density variants; the choice of `duplicated_lines` matches the post-push
  gate's existing definition on SonarCloud. A future change that adds
  `new_duplicated_lines` for a "new code only" mode is itself an ADR amendment.
- **Per-file cache key shape:** `'duplications::<branchAxis>::<componentKey>'`.
  The discriminator- prefix discipline the Hotspot extension established
  applies; the branch-axis prefix added by this ADR applies to every key.
- **Branch-axis cache prefix:** `branchAxis` participates in every cache key.
  Removing it would re-introduce the cross-branch collision risk this ADR
  closes.
- **Measures pagination hard cap:**
  `MEASURES_COMPONENT_TREE_HARD_CAP_PAGES = 10` (5000 components at `ps=500`).
  Raising it without an ADR amendment risks unbounded fetches against a future
  grown repo; lowering it silently truncates more aggressively.

### What does NOT change

- ADR-0042's "informational not gate" stance is **inherited unchanged**.
  Duplications findings exit 0 on every successful or transient-failure path. No
  `--fail-on-duplication` flag, no exit-code gating. Branch- axis 404s also
  exit 0.
- ADR-0042's `meta.schemaVersion` discipline is **inherited unchanged**. The
  duplications extension is additive at `meta.schemaVersion: 1`. No bump. The
  new `pullRequest: number | null` field on `meta.snapshotInfo` is additive;
  consumers ignoring unknown fields are unaffected.
- ADR-0045's pre-push jscpd gate is **untouched**. No `--include-jscpd`, no
  merged output. The two layers stay independent. ADR-0045's threshold-stability
  contract is unaffected.
- The `pnpm check` chain (`typecheck` → `lint` → `format:check` →
  `check:conventions`) is unchanged. `pnpm check:sonar-findings` remains the
  sibling script; `--include-duplications` and `--pull-request=<n>` are the new
  opt-in flags on it.
- `.sonar-cache/cache.json`'s on-disk wrapper shape is unchanged
  (`{ schemaVersion, entries }`). `CACHE_SCHEMA_VERSION` bumps from 2 to 3
  because the embedded keys gain the `branchAxis` prefix; the bump-and-discard
  flow already in `parseCacheEntry` migrates with one extra fetch per entry on
  first run.
- `.sonarlint/connectedMode.json` continues to be the single configuration
  source for both SonarLint VS Code and the script.
- No Astro source code is touched. No `routes.ts`. ADR-0036 slot- presence rules
  are not applicable.

### Out of scope

- **Predictive / new-code analysis.** The script reports SonarCloud's view of
  the most recent analysis on the resolved branch. Inherited from ADR-0042.
- **jscpd integration of any kind.** The pre-push jscpd hook (ADR-0045) and this
  CLI extension stay independent. No `--include-jscpd`, no merged output.
  Inherited.
- **Auto-fix or refactor suggestions.** The CLI reports findings; it does not
  propose extractions. Inherited.
- **Adding duplications to `sonar-issues.csv`** or any other on-disk snapshot
  artefact. Inherited from ADR-0042.
- **Write operations against SonarCloud.** No `--mark-acknowledged`, no
  `--exclude`, no mutation of any duplication record. Inherited.
- **CI integration.** The `pnpm check` chain stays unchanged. SonarCloud
  Automatic Analysis on PR remains the post-push gate. Inherited.
- **A new pnpm script.** This task extends `check:sonar-findings`, not
  `check:sonar-duplications`. Inherited from ADR-0042.
- **Husky pre-push integration.** The script remains opt-in invocation only.
  Inherited.
- **A breaking JSON envelope change.** Extension is additive at
  `meta.schemaVersion: 1`. Inherited.
- **Visual sugar beyond the existing pretty-print conventions.** No
  ANSI-coloured severity, no progress bars, no interactive prompts.
- **Migration of existing Issues+Hotspots prose** out of `docs/DEVELOPMENT.md`.
  The owner-decision (2026-05-07) defers any extraction to
  `docs/reference/sonar-findings-runner.md` to a separate, scoped follow-up.
- **Auto-discovery of the open PR number.** The runner does not call
  `gh pr view` or read `.git` to guess a PR number. The `--pull-request=<n>`
  flag is explicit-only.

## Consequences

### Positive

- **Branch-aware verify-pass.** The agent's verify-pass step now surfaces
  findings on the **current** branch, not on the project's default branch.
  False-negatives where a feature branch introduces findings but the script
  reports a clean default-branch state are closed.
- **Post-push duplications visibility.** The agent's verify-pass step surfaces
  SonarCloud's duplications findings on the touched file set without a browser
  tab. Closes the highest-priority Sonar-CLI follow-up recorded after PR #199.
- **Round-trip economy on the default case.** The default invocation issues N
  `duplications/show` calls for N touched files (N is typically 2-15). No
  measures call. Approach B's "always chain" would have added a wasted
  round-trip on every default invocation.
- **Per-file cache-hit improvement.** Two invocations sharing 80% of the file
  set hit the cache on the shared 80%. Issues and hotspots' file- set keying
  would have missed the entire tuple. The branch-axis prefix partitions cache
  entries cleanly across branches without losing the shared-hit benefit within a
  branch.
- **File layout matches the contract ADR-0042 set.** The third-endpoint
  flip-point fired as ADR-0042 named it. Future contributors reading the
  post-split `scripts/sonar-findings/` directory see one file per endpoint, plus
  the shared infrastructure file. The on-ramp is shorter than reading a single
  1100+ LoC `query.mjs`.
- **Bus-factor handover.** Running
  `pnpm check:sonar-findings --include-duplications` in a fresh clone yields
  meaningful output without configuring anything (public project,
  unauthenticated path). Token-storage instructions cover the private-project
  case.

### Negative

- **PR size at landing.** The introductory PR carries ten commits: three
  file-split refactor commits, two branch-axis commits (issues
  - hotspots), one ADR commit, one feature commit (duplications + branch-axis on
    the new endpoint), and three documentation commits (cross-references,
    DEVELOPMENT.md, ARCHITECTURE.md + agent lockstep). Mitigation: per-commit
    review surfaces stay small; the file-split commits have zero risk by
    construction (mechanical move
  - green tests on each); the branch-axis commits each add one parameter through
    one URL builder and its tests.
- **Cache bump-and-discard on first run.** Every developer's existing
  `.sonar-cache/cache.json` (under v2) becomes invalid on the first run after
  this ADR lands. One extra round-trip per cache key on first run; the
  `parseCacheEntry`'s `version-mismatch` branch already handles this.
  Acceptable: the alternative is silent cross-branch cache mismatches.
- **Dual-fetch latency on `--all`.** The measures pre-fetch adds one (or up to
  ten paginated) round-trips before the per-file iteration on `--all`.
  Acceptable: the alternative is N round-trips with N=hundreds.
- **Synthetic rule key is a fabrication.** A future contributor grepping
  `'sonarcloud:duplicated-block'` against the SonarCloud rule registry finds
  nothing. Mitigated by the `sonarcloud:` prefix signalling the synthesis and
  the trap-comment in `duplications.mjs` routing to this ADR.
- **Per-file cache key is asymmetric.** A future contributor adding a fourth
  endpoint may reach for the issues/hotspots file-set key shape by analogy.
  Mitigated by the trap-comment documenting the asymmetry and by the cache-key
  tests in `duplications.test.mjs` enforcing the per-file key shape.
- **Branch-axis 404 vs. 200/empty asymmetry.** SonarCloud reports an unanalysed
  branch as HTTP 404 on three endpoints and HTTP 200 with an empty list on the
  issues endpoint. The runner converts both shapes to the same warning, but the
  underlying asymmetry is server- side and not within the runner's control.
  Recorded so a future reviewer of the classifier understands why the 404 row
  exists at all.
- **Output volume grows with `--include-duplications`.** A repo with many
  duplication clusters surfaces N findings per cluster, where N is the
  touched-file membership in the cluster (or the number of distinct block
  regions within a single same-file cluster). Mitigated by the deduplication
  helper (one finding per `(file, from, size)` tuple) and by the lifecycle of
  `--include-duplications` as opt-in.

### Risk mitigation

- **Endpoint schema drift.** The captured fixtures
  (`scripts/sonar-findings/fixtures/duplications-show-response.json` and
  `measures-component-tree-response.json`) are the test-time snapshot of each
  response shape, with anonymised but real-shape field sets confirmed against
  the live SonarCloud API at concept- authoring time (`from`, `size`, `_ref` for
  blocks; the `files` table keyed by `_ref` strings; `measures[].value` as a
  string; the three-field `paging` shape). The parsers are defensive (tolerate
  absent optional fields, throw on absent required fields). A future SonarSource
  schema change that breaks either parser surfaces as a unit-test failure first
  and a runtime error second; both are recoverable with a fixture-and-parser
  update PR. Mirrors ADR-0042's schema-drift contract.
- **Cache-corruption recovery.** Malformed cached payloads from either new
  endpoint collapse to a fresh fetch (issues/hotspots path) plus an empty
  result + warning (duplications path). Inherits ADR-0042's defensive-parse
  contract.
- **Public-API rate limit on `--all`.** The `--all` path issues
  pagination-pages + M round-trips for M files-with-duplications. Mitigation:
  the 5-minute cache absorbs repeat invocations; a 429 from SonarCloud falls
  back to cached results per ADR-0042's existing classifier.
- **Measures pagination ceiling.** The hard cap of 10 pages (5000 components at
  `ps=500`) is well above this project's current 100-component scale. A future
  repo growth past the cap emits a warning naming the truncation; the runner
  does not silently drop data.
- **Trap-comment pattern (duplications variant).** A new trap-comment in
  `duplications.mjs` documents (a) the single-component endpoint shape vs. the
  multi-component issues/hotspots shapes, (b) the per- file cache key vs. the
  file-set issues/hotspots keys, (c) the synthetic rule key vs. the SonarCloud
  rule registry, (d) the branch-axis 404 vs. 200/empty asymmetry, and (e) the
  `value`-as- string coercion in the measures parser. The comment is dated and
  links to this ADR section.

## Cross-references

The implementer copies the following text block verbatim into
`docs/adr/0042-agent-side-sonarcloud-findings-query.md` immediately after the
existing `### Hotspot extension` subsection (before the
`### Scope and non-goals` heading), as a new sibling subsection:

```markdown
### Branch-aware queries and duplications extension

A subsequent extension closed two gaps at once. First, the post-push
duplications gap that ADR-0045 named as a follow-up; the structurally new shape
(chained fetch, per-file cache key, third sibling endpoint file under
`scripts/sonar-findings/`) warranted a dedicated ADR. Second, an unstated
assumption in this ADR — that running the script on a feature branch reports
findings against the project's default branch — was inverted: every URL the
runner builds now carries `?branch=<currentBranch>` (or `?pullRequest=<n>` when
the new `--pull-request` flag is set), uniformly across issues, hotspots, and
duplications.
[ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
records both decisions in full. The flip-point criterion this ADR set ("third
endpoint extension lands → split to `scripts/sonar-findings/<endpoint>.mjs`")
fired with that work; the post-split layout is described in ADR-0046's Decision
section. The cache-key discriminator added here gains two new literals
(`'duplications::'` and `'measures-tree::'`) joining the existing `'issues::'`
and `'hotspots::'` shapes, plus an unconditional `<branchAxis>` segment in every
key shape; on-disk `CACHE_SCHEMA_VERSION` bumps from 2 to 3 to invalidate
cross-branch cache hits written before the branch-axis change. The opt-in flag
pattern this section established (`--include-hotspots`) gains a sibling
(`--include-duplications`) and a non-include flag (`--pull-request=<n>`) on the
same `pnpm check:sonar-findings` script.
```

The implementer also updates the existing forward-pointer in
`docs/adr/0045-local-jscpd-duplication-gate.md` § References. The current text
reads:

```markdown
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — agent-side
  SonarCloud findings query, the third local-prevention layer. The future
  duplications-metric extension to `pnpm check:sonar-findings` (post-push parity
  coverage) extends ADR-0042, not this ADR.
```

It is replaced by:

```markdown
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — agent-side
  SonarCloud findings query, the third local-prevention layer.
- [ADR-0046](0046-sonarcloud-branch-aware-findings-and-duplications-extension.md)
  — duplications extension to `pnpm check:sonar-findings` (post-push parity
  coverage) plus uniform branch-aware scoping for issues, hotspots, and
  duplications; extends ADR-0042's prevention model and supersedes ADR-0042's
  third-endpoint flip-point clause via the file-split it executes.
```

Both edits land in the cross-reference commit (Commit 9 in the concept's commit
plan), after both this ADR and the file-split + branch-axis + feature commits
exist.

## Success criteria

- A fresh clone, after `pnpm install` and a one-line `.env.local` paste (or no
  paste, for the public-project default while the project remains public), runs
  `pnpm check:sonar-findings --include-duplications` and sees the duplications
  findings on the current branch (or, when the branch has not yet been analysed,
  a clear warning and an empty result, exit 0) within five seconds.
- An automated contributor running
  `pnpm check:sonar-findings --include-duplications --include-hotspots --json --files <touched>`
  receives a JSON envelope with `findings`, `hotspots`, and `duplications`
  arrays plus `meta.snapshotInfo.duplicationsIncluded: true`,
  `meta.snapshotInfo.hotspotsIncluded: true`,
  `meta.snapshotInfo.branch: <current>`, and
  `meta.snapshotInfo.pullRequest: null` (or the supplied PR id). Under
  `--pull-request=<n>`, `branch` continues to hold the resolved current local
  branch name; the PR id surfaces only on `pullRequest`, not as a `branch`
  mutation (see Decision § JSON envelope additivity for the contract).
- The script's unit tests pass on every PR via the existing `pnpm test:run` step
  (no `pnpm check` chain extension).
- Cumulative runtime cost in a single session stays under five seconds for
  cached repeat invocations and under ten seconds for the first cold call on a
  touched file set of 2-15 files. The `--all` path is acceptably bounded by the
  measures pre-fetch with the 10-page hard cap.
- A future contributor changing the synthetic rule key, the default measures
  metric set, the per-file cache key shape, the branch-axis cache prefix, or the
  measures pagination hard cap without updating this ADR's Status (or producing
  a successor ADR) trips the threshold-stability contract; the change is either
  reverted or this ADR is updated in the same PR.

## References

- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — SonarLint
  Connected Mode as the primary edit-time prevention layer; the
  empirical-evidence model this ADR's prevention layer count inherits.
- [ADR-0042](0042-agent-side-sonarcloud-findings-query.md) — the agent-side
  SonarCloud findings query (third local-prevention layer); this ADR fires its
  third-endpoint file-split flip-point, extends its endpoint set with
  duplications, adds a uniform branch axis to every endpoint, and inherits its
  informational-not-gate stance, schema- additivity discipline, and
  cache-discriminator pattern.
- [ADR-0045](0045-local-jscpd-duplication-gate.md) — the local pre-push jscpd
  duplication gate (fourth local-prevention layer); this ADR is the post-push
  parity it named as a follow-up. The two layers stay structurally independent.
- [ADR-0006](0006-enforce-strict-environment-and-dependency-pinning.md) —
  exact-version pinning; Node 24's built-in `fetch` and `--env-file-if-exists`
  continue to cover the runtime.
- [SonarCloud Web API — `/api/duplications/show`](https://sonarcloud.io/web_api/api/duplications/show)
  — the endpoint shape, query parameters (`key=<componentKey>`, `branch=`,
  `pullRequest=`), and response format the duplications path consumes. The
  captured fixture confirms the per-file response shape against this project's
  data at concept-authoring time.
- [SonarCloud Web API — `/api/measures/component_tree`](https://sonarcloud.io/web_api/api/measures/component_tree)
  — the endpoint shape, query parameters (`component`, `metricKeys`,
  `qualifiers`, `ps`, `p`, `branch`, `pullRequest`), and response format the
  measures pre-fetch consumes on `--all`. The captured fixture confirms
  `measures[].value` is reported as a string and the three-field `paging` shape.
- [SonarCloud — Duplication settings](https://docs.sonarsource.com/sonarcloud/digging-deeper/managing-duplications/)
  — context for SonarCloud's CPD behaviour and the metric definitions this ADR's
  `metricKeys=duplicated_lines` choice maps to.
- `scripts/check-sonar-findings.mjs` — the CLI entry script; gains the
  `--include-duplications` and `--pull-request=<n>` flags, the branch-axis
  threading on every endpoint URL builder, and the `fetchAndCollectDuplications`
  orchestrator parallel to `fetchAndFilterHotspots`.
- `scripts/sonar-findings/duplications.mjs` — the new pure-logic endpoint file
  added by this ADR's split.
- `scripts/sonar-findings/issues.mjs` and `scripts/sonar-findings/hotspots.mjs`
  — sibling endpoint files relocated from `query.mjs` as part of the split this
  ADR executes; their URL builders gain the `branchAxis` parameter.
- `scripts/sonar-findings/query.mjs` — post-split, hosts the shared
  infrastructure layer named in the Decision section, including the polymorphic
  `cacheKeyOf` and the section-formatter helpers.
- `docs/DEVELOPMENT.md` § SonarLint Connected Mode → Agent-Side Findings Query →
  Duplications Coverage — per-developer setup instructions, the snapshot-vs-live
  limitation note, and the branch- axis behaviour description.
