# Audit — Sonar Duplications Metric Branch Review (2026-05-09)

Phase-4 review of the branch that introduced branch-axis threading on
`pnpm check:sonar-findings`, the new duplications endpoint, ADR-0046, and the
supporting documentation. Two review rounds were run; this document records the
deferred item the second round did not close, so it survives the worktree
cleanup.

## Outcome

- **Round 1:** 0 Blockers, 0 Majors, 5 Minors, 3 Nits.
- **Round 2:** 0 Blockers, 0 Majors, 0 Minors, 2 Nits.

Of round 1's findings, four Minors (1, 2, 3, 4) and two Nits were fixed
in-branch. Round 2's two Nits were also fixed in-branch. One Minor and one Nit
were deferred:

- **Minor 5** — fresh-fetch parser-throw guard. Recorded below; `DEBT-260509-01`
  in `docs/debt/REGISTER.md`.
- **Nit 3** — a per-commit body referenced a fixture file under `.claude/tmp/`
  which does not survive the worktree cleanup. The squash merge collapses
  per-commit bodies on the way to `main`, so the artefact never lands in the
  public history. No debt entry is needed.

## Deferred — Minor 5: fresh-fetch parser-throw guard

### Symptom

When SonarCloud returns a malformed payload on a fresh fetch (shape change,
truncation, content-type mismatch), the response parser throws. The throw
propagates up through the per-endpoint iterator, through the orchestrator, and
exits `runMain` with status 1.

The cached-payload path already collapses the same kind of throw to a warning
plus an empty result via `parseCachedPayload`. The fresh-fetch path does not.
The asymmetry exists on all three endpoints today: issues, hotspots, and
duplications.

### Files

- `scripts/check-sonar-findings.mjs` — duplications fresh-fetch path around the
  call to `parseDuplicationsShowResponse(fetchResult.payload)`.
- `scripts/check-sonar-findings.mjs` — hotspots fresh-fetch path around the call
  to `parseHotspotsResponse(fetchResult.payload)`.
- `scripts/check-sonar-findings.mjs` — issues fresh-fetch path around the call
  to `parseIssuesResponse(fetchResult.payload)`.

(Line numbers move under refactors. Grep for the three parser calls to locate
the fresh-fetch sites.)

### Why this contradicts ADR-0042

ADR-0042 records an "exit 0 on every transient-failure path" stance. The ADR
treats parser throws as transient — a malformed live response should warn and
continue, not gate. The fresh-fetch path violates that stance on all three
endpoints. A live API shape change can therefore turn the verify-pass from a
warning-emitting informational tool into a gate that fails the implementer's
local check until the parser is patched. The cached path is robust to the same
shape change and does not gate; the asymmetry is the bug.

### Why this was deferred from the original branch

The asymmetry is older than the branch under review. The issues and hotspots
fresh-fetch paths already had the gap in `main` before the duplications endpoint
was added. Closing the gap on all three endpoints in the same PR that introduces
the duplications endpoint would have mixed two concerns and complicated the
review surface. The branch under review intentionally added the duplications
path with the same gap as the existing two endpoints (consistency with the
present `main` behaviour), and recorded this debt item for a separate PR.

### Recommended fix

Wrap each of the three fresh-fetch parser calls in a try/catch block that
mirrors `parseCachedPayload`'s contract:

- catch the throw,
- emit a warning consistent with the cached-payload warning text,
- return an empty result for that fetch,
- preserve exit 0.

Add e2e coverage in `scripts/check-sonar-findings.test.mjs` for the fresh-fetch
malformed-payload arm on each endpoint. The existing S3 / S5b / S6
describe-blocks cover the cached arms only; the new specs would parallel those
for the fresh path. After the fix, the runner emits the same warning whether the
malformation is read from cache or from a live response — the only observable
difference being the warning's source attribution.

### Cross-references

- ADR-0042 — Agent-side SonarCloud findings query. Source of the "exit 0 on
  transient" stance the deferred item violates.
- ADR-0046 — Branch-aware findings + duplications extension. Reviewed in the
  rounds summarised here. The deferred item is out-of-scope from ADR-0046.
- `safeParsePayload` (renamed from `parseCachedPayload` during DEBT-260509-01
  closeout) in `scripts/check-sonar-findings.mjs` — the contract the fix mirrors
  uniformly across cache and fresh arms.

The full Round-1 and Round-2 review records lived in
`.claude/work/2026-05-07-sonar-duplications-metric/04-review-r1.md` and
`04-review-r2.md` until the worktree cleanup. The deferred-items summary above
is the durable extract.

## Resolution

Closed YYYY-MM-DD via PR #<TBD>.

Phase-2 grep widened the scope from the three endpoints recorded above (issues,
hotspots, duplications-show) to four: a fourth fresh-fetch parser call at the
same structural position, `parseMeasuresComponentTreeResponse` inside
`fetchMeasuresComponentTreePage`, was discovered at concept-authoring time and
added to the closing PR with owner approval.

The `parseCachedPayload` helper was renamed to `safeParsePayload` and extended
with a `source: 'cache' | 'fresh'` parameter. The cache arm keeps its existing
warning text — `<label>: cache payload shape invalid; treating as empty` —
byte-identical. The fresh arm emits the symmetric
`<label>: fresh response shape invalid; treating as empty`. All four fresh-fetch
call sites (issues, hotspots, duplications-show, measures-tree) now route
through the safe parser, exit 0 on parser throw, and warn to stderr +
`meta.warnings`.

Tests added: one mutation pair per endpoint in a new
`S7 fresh-fetch strict-throw exit-0 contract` describe-block in
`scripts/check-sonar-findings.test.mjs` (label confirmed at Phase-2 close — see
`02-concept.md` Open Assumption #1).

ADR amendment: ADR-0042 § "Exit codes" was amended in the same PR to drop
"malformed API response" from the exit-1 list and extend the schema-drift
carve-out to cover both cached and fresh payloads. ADR-0046 § "Schema-drift
cache contract" gained a one-sentence cross-reference.
