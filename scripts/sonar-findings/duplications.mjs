/**
 * Duplications-endpoint surface for the agent-side SonarCloud findings query.
 *
 * What lives here:
 *   - buildDuplicationsShowUrl({ baseUrl, projectKey, file, branchAxis }):
 *     constructs the `/api/duplications/show` URL. The endpoint accepts a
 *     single component per call via `key=<projectKey>:<file>` (no
 *     multi-component variant exists).
 *   - buildMeasuresComponentTreeUrl({ baseUrl, component, metricKeys, qualifiers, ps, p, branchAxis }):
 *     constructs the `/api/measures/component_tree` URL. Walks the project
 *     subtree paginated by `ps`/`p` so the orchestrator can drive the
 *     pagination loop.
 *   - parseDuplicationsShowResponse(payload): projects the API's
 *     `{ duplications, files }` shape into a flat array of clusters whose
 *     blocks carry resolved component keys (the API references them via
 *     string `_ref` keys into the sibling `files` table).
 *   - parseMeasuresComponentTreeResponse(payload): projects the API's
 *     paginated `{ paging, components }` shape into a `{ paging, files }`
 *     tuple where `files[i].duplicatedLines` is the `Number()`-coerced
 *     measure value (the API reports `measures[].value` as a string, e.g.
 *     `"160"`); filters out components whose `duplicated_lines` is zero.
 *   - mapDuplicationToFindings(cluster, filesTable, projectKey, perspectiveFile):
 *     projects a single cluster into one finding per block whose `_ref`
 *     resolves to a file in the touched set. Synthetic rule key
 *     `sonarcloud:duplicated-block` per ADR-0046; the SonarCloud
 *     duplications-metric does not surface a registry rule key
 *     (`common-js:DuplicatedBlocks` and `common-ts:DuplicatedBlocks` are
 *     per-language and would mis-categorise cross-language clusters).
 *   - dedupeDuplicationFindings(findings): collapses `(file, line, size)`
 *     duplicates that surface when one cross-file cluster appears in
 *     multiple per-file responses.
 *
 * What does NOT live here:
 *   - Shared infrastructure (cache helpers, error classifier, formatters,
 *     `compareFindings`, `parseConnectedMode`, etc.) stays in `query.mjs`
 *     so multiple endpoint modules can reuse it without circular imports.
 *   - The pretty-printer's duplications section
 *     (`appendDuplicationsSection`) lives with `formatPretty` in
 *     `query.mjs` because the orchestrator owns the section-stacking order
 *     across endpoints.
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/duplications.test.mjs (unit tests)
 *
 * Endpoint-asymmetry trap-comment (see ADR-0046 § Endpoint asymmetry vs.
 * Issues + Hotspots; captured 2026-05-08 against the live SonarCloud API
 * and recorded in
 * `docs/adr/0046-sonarcloud-branch-aware-findings-and-duplications-extension.md`).
 * The duplications endpoint diverges from issues + hotspots on five axes a
 * future maintainer should not normalise away by analogy:
 *   1. Component scoping. Issues use `componentKeys=<projectKey>:<file>,...`
 *      and hotspots use `files=<file>,...` (multi-file in one call); the
 *      duplications endpoint accepts only `key=<projectKey>:<file>`
 *      (single component per call). Per-file iteration is the only shape.
 *   2. Cache axis. Issues + hotspots key by `(branchAxis, sortedFiles, ...)`;
 *      the duplications endpoint keys per file by
 *      `(branchAxis, componentKey)` and the measures pre-fetch keys by
 *      `(branchAxis, projectKey, metricKeys)`. The per-file shape gives a
 *      strict cache-hit improvement on overlapping touched-file invocations
 *      and is the structural reason `cacheKeyOf` is polymorphic over four
 *      endpoint literals (ADR-0046 § Cache-key shapes).
 *   3. Finding identity. Issues + hotspots carry SonarCloud rule keys
 *      (`typescript:S1234`, `javascript:S5852`); duplications carry the
 *      synthetic `sonarcloud:duplicated-block`. The synthetic key is a
 *      deliberate fiction: SonarCloud reports the metric as
 *      `common-js:DuplicatedBlocks` / `common-ts:DuplicatedBlocks` per
 *      language, and picking either would mis-categorise cross-language
 *      clusters. The `sonarcloud:` prefix flags the synthesis so a future
 *      contributor grepping the SonarCloud rule registry finds nothing and
 *      lands on this file instead.
 *   4. Section header in pretty mode. Issues have no header (the default
 *      table is the issues section); hotspots use `Security Hotspots:`;
 *      duplications use `Duplicated Blocks:`. The format-orchestrator stacks
 *      them in fixed order in `formatPretty` (`query.mjs`).
 *   5. Branch-axis fallback semantics. Issues' silent
 *      HTTP-200-with-empty-list on an unanalysed branch is the only
 *      endpoint that does not 404 in that case; duplications, measures, and
 *      hotspots all return HTTP 404 on both the branch and the PR axes. The
 *      runner converts both shapes to the same warning via the branch-aware
 *      404 row in `classifyError` (`query.mjs`); the asymmetry is server-
 *      side and outside the runner's control.
 * ADR-0046 § Endpoint asymmetry vs. Issues + Hotspots and § Behaviour →
 * Branch-axis fallback semantics record the empirical evidence behind these
 * five points in full.
 */

import { compareFindings, SONARCLOUD_BASE_URL, stripComponentPrefix } from './query.mjs';

/** @typedef {import('./query.mjs').BranchAxis} BranchAxis */

/**
 * Synthetic rule key the duplications path stamps on every finding. Per
 * ADR-0046 § Decision, SonarCloud's duplications-metric does not surface a
 * single rule registry entry (the metric is reported under
 * `common-js:DuplicatedBlocks` and `common-ts:DuplicatedBlocks` per
 * language); the `sonarcloud:` prefix signals the deliberate fiction so a
 * future contributor grepping the SonarCloud rule registry finds nothing
 * and follows the prefix back here. Threshold-stable per ADR-0046 §
 * Threshold-stability contract.
 */
export const DUPLICATIONS_RULE_KEY = 'sonarcloud:duplicated-block';

/**
 * Default page size for the `/api/measures/component_tree` endpoint. The
 * SonarCloud server caps `ps` at 500; this matches the cap so the
 * orchestrator paginates as few times as possible. Threshold-stable per
 * ADR-0046 § Threshold-stability contract.
 */
export const DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE = 500;

/**
 * Hard cap on the measures-component-tree pagination loop. At
 * `DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE = 500`, ten pages cover 5000
 * components — well above this project's ~110-component scale. A
 * `paging.total` exceeding the cap emits a warning naming the truncation
 * and proceeds with the pages fetched so far (best-effort, exit 0). Raising
 * the cap without an ADR-0046 amendment risks unbounded fetches against a
 * future grown repo; lowering it silently truncates more aggressively.
 * Threshold-stable per ADR-0046 § Threshold-stability contract.
 */
export const MEASURES_COMPONENT_TREE_HARD_CAP_PAGES = 10;

/**
 * Sets the branch-axis URL parameter on a `URLSearchParams` builder per
 * ADR-0046: `&branch=<encoded>` for the branch axis, `&pullRequest=<id>`
 * for the PR axis. Pulled out to keep both URL builders below the
 * cognitive-complexity ceiling and to share one source of truth on the
 * encoding (the URL builders for issues and hotspots use the same
 * pattern; this helper is duplications-local because the import direction
 * runs `duplications.mjs → query.mjs`, not the other way round).
 *
 * @param {URLSearchParams} params
 * @param {BranchAxis} branchAxis
 */
function setBranchAxisParam(params, branchAxis) {
  if (branchAxis.kind === 'pullRequest') {
    params.set('pullRequest', branchAxis.id);
  } else {
    params.set('branch', branchAxis.name);
  }
}

/**
 * Constructs the `/api/duplications/show` URL for SonarCloud. The endpoint
 * accepts a single component per call via `key=<projectKey>:<file>`; no
 * multi-component variant exists (verified empirically — see ADR-0046).
 * Per-file iteration is the only shape.
 *
 * The `branchAxis` parameter emits either `&branch=<encoded>` (when
 * `kind === 'branch'`) or `&pullRequest=<id>` (when `kind === 'pullRequest'`)
 * per ADR-0046. The runner threads the resolved axis at the call site;
 * URL builders never default the axis silently. Mirrors `buildIssuesUrl`
 * and `buildHotspotsUrl`.
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.projectKey
 * @param {string} input.file - bare relative path (no `<projectKey>:` prefix)
 * @param {BranchAxis} input.branchAxis - branch or pull-request axis
 * @returns {string} fully encoded URL
 */
export function buildDuplicationsShowUrl(input) {
  const baseUrl = input.baseUrl ?? SONARCLOUD_BASE_URL;
  const params = new URLSearchParams();
  params.set('key', `${input.projectKey}:${input.file}`);
  setBranchAxisParam(params, input.branchAxis);
  return `${baseUrl}/api/duplications/show?${params.toString()}`;
}

/**
 * Constructs the `/api/measures/component_tree` URL for SonarCloud. Used
 * by the duplications path's `--all` short-circuit to identify
 * files-with-duplications via the `duplicated_lines` measure before
 * iterating the per-file `/api/duplications/show` calls.
 *
 * `metricKeys` is joined comma-separated. `qualifiers` defaults to `'FIL'`
 * (file-level components only); the endpoint also supports `'DIR'` and
 * `'TRK'` but the duplications path filters at the file granularity. `ps`
 * defaults to `DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE = 500`; `p`
 * defaults to `1` so a non-paginating call site reads the first page
 * deterministically.
 *
 * The `branchAxis` parameter emits either `&branch=<encoded>` or
 * `&pullRequest=<id>` per ADR-0046, on the same call-site discipline as
 * the other URL builders.
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.component - the project key (or any subtree root)
 * @param {readonly string[]} input.metricKeys - e.g. ['duplicated_lines']
 * @param {string} [input.qualifiers] - defaults to 'FIL'
 * @param {number} [input.ps] - page size; defaults to 500
 * @param {number} [input.p] - 1-based page index; defaults to 1
 * @param {BranchAxis} input.branchAxis - branch or pull-request axis
 * @returns {string} fully encoded URL
 */
export function buildMeasuresComponentTreeUrl(input) {
  const baseUrl = input.baseUrl ?? SONARCLOUD_BASE_URL;
  const qualifiers = input.qualifiers ?? 'FIL';
  const ps = input.ps ?? DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE;
  const p = input.p ?? 1;
  const params = new URLSearchParams();
  params.set('component', input.component);
  params.set('metricKeys', input.metricKeys.join(','));
  params.set('qualifiers', qualifiers);
  params.set('ps', String(ps));
  params.set('p', String(p));
  setBranchAxisParam(params, input.branchAxis);
  return `${baseUrl}/api/measures/component_tree?${params.toString()}`;
}

/**
 * Resolves a single block's `_ref` against the response's `files` reference
 * table to recover the component key. Returns `null` when the ref is not a
 * string, when the table is missing, or when the entry is missing or
 * malformed (defensive — the verified API shape always supplies a matching
 * entry, but a future API change should not throw).
 *
 * @param {unknown} ref
 * @param {Record<string, unknown> | undefined} filesTable
 * @returns {string | null}
 */
function resolveBlockComponentKey(ref, filesTable) {
  if (typeof ref !== 'string' || ref.length === 0) return null;
  if (filesTable === undefined || filesTable === null) return null;
  const entry = filesTable[ref];
  if (entry === null || typeof entry !== 'object') return null;
  const key = /** @type {Record<string, unknown>} */ (entry).key;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/**
 * Parses the SonarCloud `/api/duplications/show` response into a flat
 * clusters array whose blocks carry resolved component keys (the API
 * references them via string `_ref` keys into the sibling `files` table).
 * Tolerates absent optional fields per individual block; throws when the
 * required `duplications` array is absent — that signals a structural API
 * change the parser cannot handle.
 *
 * Returned cluster shape: `{ blocks: Array<{ from: number, size: number,
 * componentKey: string | null }> }`. A `null` `componentKey` means the
 * block's `_ref` did not resolve in the response's files table; the
 * caller filters those out before mapping to findings.
 *
 * @param {unknown} payload - the parsed JSON response
 * @param {{ projectKey?: string }} [_options] - accepted for signature symmetry with the issues/hotspots parsers; ignored by this parser
 * @returns {Array<{ blocks: Array<{ from: number, size: number, componentKey: string | null }> }>}
 */
export function parseDuplicationsShowResponse(payload, _options) {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('SonarCloud response is not an object');
  }
  const root = /** @type {Record<string, unknown>} */ (payload);
  const duplications = root.duplications;
  if (!Array.isArray(duplications)) {
    throw new TypeError('SonarCloud response is missing the duplications array');
  }
  const filesTable =
    root.files !== null && typeof root.files === 'object' && !Array.isArray(root.files)
      ? /** @type {Record<string, unknown>} */ (root.files)
      : undefined;
  const clusters = [];
  for (const cluster of duplications) {
    const blocks = parseClusterBlocks(cluster, filesTable);
    if (blocks.length > 0) {
      clusters.push({ blocks });
    }
  }
  return clusters;
}

/**
 * Validates a single duplication cluster's `blocks` array and returns the
 * normalised block list. Returns an empty array when the cluster shape is
 * malformed or every block fails validation; callers drop empty clusters
 * before they reach the surfaced findings.
 *
 * @param {unknown} cluster
 * @param {Record<string, unknown> | undefined} filesTable
 * @returns {Array<{ from: number, size: number, componentKey: string | null }>}
 */
function parseClusterBlocks(cluster, filesTable) {
  if (cluster === null || typeof cluster !== 'object') return [];
  const blocksRaw = /** @type {Record<string, unknown>} */ (cluster).blocks;
  if (!Array.isArray(blocksRaw)) return [];
  const blocks = [];
  for (const block of blocksRaw) {
    if (block === null || typeof block !== 'object') continue;
    const record = /** @type {Record<string, unknown>} */ (block);
    const fromRaw = record.from;
    const sizeRaw = record.size;
    if (typeof fromRaw !== 'number' || !Number.isFinite(fromRaw)) continue;
    if (typeof sizeRaw !== 'number' || !Number.isFinite(sizeRaw)) continue;
    const componentKey = resolveBlockComponentKey(record._ref, filesTable);
    blocks.push({ from: fromRaw, size: sizeRaw, componentKey });
  }
  return blocks;
}

/**
 * Parses the SonarCloud `/api/measures/component_tree` response into a
 * `{ paging, files }` tuple the orchestrator drives the pagination loop
 * from. The API reports `measures[].value` as a **string** (e.g. `"160"`,
 * `"0"` — verified empirically); the parser coerces with `Number(value)`
 * and filters on `Number(value) > 0`. Components with absent `measures[]`
 * or with `bestValue: true` (the canonical "no duplications" signal,
 * which the API also emits when `value === "0"`) drop out for free.
 *
 * Tolerates absent optional fields per component; throws when the required
 * `paging` or `components` shape is missing.
 *
 * Returned shape:
 *   `{ paging: { pageIndex: number, pageSize: number, total: number },
 *      files: Array<{ componentKey: string, duplicatedLines: number }> }`
 *
 * @param {unknown} payload
 * @param {{ projectKey?: string }} [_options] - accepted for signature symmetry with the issues/hotspots parsers; ignored by this parser
 * @returns {{ paging: { pageIndex: number, pageSize: number, total: number }, files: Array<{ componentKey: string, duplicatedLines: number }> }}
 */
export function parseMeasuresComponentTreeResponse(payload, _options) {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('SonarCloud response is not an object');
  }
  const root = /** @type {Record<string, unknown>} */ (payload);
  const pagingRaw = root.paging;
  if (pagingRaw === null || typeof pagingRaw !== 'object') {
    throw new TypeError('SonarCloud response is missing the paging object');
  }
  const components = root.components;
  if (!Array.isArray(components)) {
    throw new TypeError('SonarCloud response is missing the components array');
  }
  const pagingRecord = /** @type {Record<string, unknown>} */ (pagingRaw);
  const paging = {
    pageIndex: typeof pagingRecord.pageIndex === 'number' ? pagingRecord.pageIndex : 1,
    pageSize:
      typeof pagingRecord.pageSize === 'number'
        ? pagingRecord.pageSize
        : DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE,
    total: typeof pagingRecord.total === 'number' ? pagingRecord.total : 0,
  };
  const files = [];
  for (const component of components) {
    const file = parseComponentMeasuresEntry(component);
    if (file !== null) {
      files.push(file);
    }
  }
  return { paging, files };
}

/**
 * Validates a single `/api/measures/component_tree` component entry and
 * returns the `{ componentKey, duplicatedLines }` tuple, or `null` when any
 * required field is malformed or `duplicated_lines` is not a positive number.
 * Centralises the per-component guard chain so the parser body stays a thin
 * paging-and-collection orchestrator.
 *
 * @param {unknown} component
 * @returns {{ componentKey: string, duplicatedLines: number } | null}
 */
function parseComponentMeasuresEntry(component) {
  if (component === null || typeof component !== 'object') return null;
  const record = /** @type {Record<string, unknown>} */ (component);
  const componentKey = typeof record.key === 'string' ? record.key : '';
  if (componentKey.length === 0) return null;
  const measures = record.measures;
  if (!Array.isArray(measures) || measures.length === 0) return null;
  const measure = measures[0];
  if (measure === null || typeof measure !== 'object') return null;
  const valueRaw = /** @type {Record<string, unknown>} */ (measure).value;
  if (typeof valueRaw !== 'string') return null;
  const duplicatedLines = Number(valueRaw);
  if (!Number.isFinite(duplicatedLines) || duplicatedLines <= 0) return null;
  return { componentKey, duplicatedLines };
}

/**
 * Builds the per-block partner-message fragment surfaced in pretty-print
 * mode. When all of a cluster's other blocks point at the same file as
 * `perspectiveFile`, the message names the same-file partner regions
 * (`"duplicated block (also at line <otherFrom>)"`); when at least one
 * partner block resolves to a different file, the message names the
 * partner file paths instead. Partner-file paths are stripped of the
 * `<projectKey>:` prefix via `stripComponentPrefix` so the user-facing
 * message reads `"duplicated with src/foo.ts"`, matching how
 * `mapIssueToFinding` and `mapHotspotToFinding` surface file paths.
 *
 * @param {ReadonlyArray<{ from: number, componentKey: string | null }>} otherBlocks
 * @param {string} perspectiveComponentKey
 * @param {string} projectKey
 * @returns {string}
 */
function describeClusterPartners(otherBlocks, perspectiveComponentKey, projectKey) {
  const partnerFiles = new Set();
  const sameFileFroms = [];
  for (const other of otherBlocks) {
    if (other.componentKey === null) continue;
    if (other.componentKey === perspectiveComponentKey) {
      sameFileFroms.push(other.from);
    } else {
      partnerFiles.add(stripComponentPrefix(other.componentKey, projectKey));
    }
  }
  if (partnerFiles.size === 0) {
    if (sameFileFroms.length === 0) {
      return 'duplicated block';
    }
    const list = sameFileFroms.map((from) => `line ${from}`).join(', ');
    return `duplicated block (also at ${list})`;
  }
  const list = [...partnerFiles].sort((a, b) => a.localeCompare(b)).join(', ');
  return `duplicated with ${list}`;
}

/**
 * Projects a single duplications cluster to one finding per block whose
 * `_ref` resolved to the queried perspective file's component key (the
 * `perspectiveFile` argument is the bare relative path, the
 * `perspectiveComponentKey` is `<projectKey>:<perspectiveFile>`). Cross-
 * file partners outside the touched set are named in the finding message
 * but do not generate their own findings unless their file is the
 * perspective on a separate `duplications/show` call (the orchestrator
 * iterates per touched file and dedupes after collection — see
 * `dedupeDuplicationFindings`).
 *
 * Per-block message: when the cluster is single-file (every block's
 * `_ref` matches the perspective component), the message names the
 * same-file partner regions; when cross-file, the message names the
 * partner file paths. Synthetic rule key `DUPLICATIONS_RULE_KEY` per
 * ADR-0046 (`sonarcloud:duplicated-block`).
 *
 * @param {{ blocks: ReadonlyArray<{ from: number, size: number, componentKey: string | null }> }} cluster
 * @param {string} projectKey
 * @param {string} perspectiveFile - bare relative path of the queried
 *   component (no `<projectKey>:` prefix)
 * @returns {Array<{ rule: string, file: string, line: number, size: number, message: string }>}
 */
export function mapDuplicationToFindings(cluster, projectKey, perspectiveFile) {
  const perspectiveComponentKey = `${projectKey}:${perspectiveFile}`;
  /** @type {Array<{ rule: string, file: string, line: number, size: number, message: string }>} */
  const findings = [];
  for (let i = 0; i < cluster.blocks.length; i += 1) {
    const block = cluster.blocks[i];
    if (block.componentKey !== perspectiveComponentKey) continue;
    const otherBlocks = cluster.blocks.filter((_, j) => j !== i);
    const message = describeClusterPartners(otherBlocks, perspectiveComponentKey, projectKey);
    findings.push({
      rule: DUPLICATIONS_RULE_KEY,
      file: perspectiveFile,
      line: block.from,
      size: block.size,
      message,
    });
  }
  return findings;
}

/**
 * Deduplicates the flat findings list by `(file, line, size)`. The same
 * cluster surfaces in N per-file `duplications/show` responses when the
 * touched file set contains N files in the same cross-file cluster; the
 * dedup helper collapses those copies to one finding per block region.
 * Issues + hotspots arrive deduplicated by the endpoint, so this helper
 * is duplications-local. Inlining the dedup in `mapDuplicationToFindings`
 * would obscure the per-cluster-multi-block iteration; the standalone
 * helper makes the dedup contract visible at the orchestrator's call
 * site.
 *
 * Returns a new array; does not mutate the input. Sorts the result by
 * `(file, line, rule)` via `compareFindings` so the orchestrator can rely
 * on deterministic ordering downstream.
 *
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, size: number, message: string }>} findings
 * @returns {Array<{ rule: string, file: string, line: number, size: number, message: string }>}
 */
export function dedupeDuplicationFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const key = `${finding.file}::${finding.line}::${finding.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }
  result.sort(compareFindings);
  return result;
}
