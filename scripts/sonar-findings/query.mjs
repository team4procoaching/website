/**
 * Pure-logic library for the agent-side SonarCloud findings query script.
 *
 * What lives here:
 *   - parseConnectedMode(json): extracts org+projectKey from
 *     `.sonarlint/connectedMode.json`, throws on missing fields.
 *   - buildIssuesUrl({ baseUrl, projectKey, files, page, pageSize, statuses }):
 *     constructs the `/api/issues/search` URL using the verified-working
 *     `componentKeys=<projectKey>:<filepath>` shape (the older `fileKeys=`
 *     parameter is silently ignored on SonarCloud — see ADR-0042).
 *   - parseIssuesResponse(payload): pulls each issue's required fields from
 *     the API response; tolerates absent optional fields; throws on absent
 *     `issues` array.
 *   - buildHotspotsUrl({ baseUrl, projectKey, files, page, pageSize }):
 *     constructs the `/api/hotspots/search` URL. The endpoint has a
 *     different parameter contract than issues: `projectKey=` for project
 *     scoping (not `componentKeys=`), `files=` for file scoping (not
 *     `componentKeys=<projectKey>:<filepath>`), and accepts neither
 *     `status=` nor `resolution=`. Lifecycle filtering is post-fetch.
 *   - parseHotspotsResponse(payload): projects the API's `hotspots[]`
 *     array into the normalised hotspot-finding shape with a joined
 *     `<status>` or `<status>+<resolution>` label; throws on absent
 *     `hotspots` array.
 *   - mapHotspotToFinding(hotspot, projectKey): single-entry mapper.
 *   - filterHotspotsByDefaultStatus(hotspots, statuses?): post-fetch
 *     lifecycle filter. Default keeps `TO_REVIEW` and
 *     `REVIEWED+ACKNOWLEDGED`, drops `REVIEWED+SAFE` and `REVIEWED+FIXED`.
 *   - formatPretty(issues, meta, hotspots?): pretty-printed table with
 *     deterministic sort `(file, line, rule)`; banner names the analysis
 *     basis. Appends a `Security Hotspots:` section when
 *     `meta.snapshotInfo.hotspotsIncluded` is true.
 *   - formatJson(issues, meta, hotspots?): stable envelope
 *     `{ meta, findings }`, with an additional top-level `hotspots`
 *     array when `meta.snapshotInfo.hotspotsIncluded` is true. Identical
 *     shape on success and transient-error paths so consumers can
 *     `jq '.findings'` without conditional logic.
 *   - cacheKeyOf({ endpoint, files, statuses?, pageSize }): pure hash of
 *     inputs; deterministic; collision-resistant via separator. The
 *     `endpoint` discriminator prevents issues/hotspots key collisions
 *     under the shared `.sonar-cache/cache.json` file.
 *   - isCacheFresh(cacheEntry, now, ttlMs): TTL check; pure.
 *   - parseCacheEntry(text): defensive JSON parse; returns `null` on parse
 *     error so the CLI runner falls through to a fresh fetch.
 *   - classifyDiffEdgeCase(gitContext): resolves the edge-case matrix
 *     pinned in the concept's "Default-input edge cases" section to a
 *     deterministic `(behaviourTag, warning)` tuple before the API path
 *     runs.
 *   - classifyError({ httpStatus, errorKind, projectKey }): resolves the
 *     failure-mode matrix pinned in the concept's "Error contract" section
 *     to a deterministic `(stderr, warning, allowStaleCache)` tuple.
 *
 * What does NOT live here:
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/query.test.mjs (unit tests)
 */

export const SONARCLOUD_BASE_URL = 'https://sonarcloud.io';
export const DEFAULT_PAGE_SIZE = 500;
export const DEFAULT_STATUSES = 'OPEN,CONFIRMED,REOPENED';
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Default page size for the `/api/hotspots/search` endpoint. Mirrors
 * `DEFAULT_PAGE_SIZE` for the issues endpoint; kept as a separate
 * declaration so the two endpoints can diverge on this axis without
 * rippling through the issues-path call sites.
 */
export const DEFAULT_HOTSPOTS_PAGE_SIZE = 500;

/**
 * Lifecycle statuses kept by `filterHotspotsByDefaultStatus` when no
 * explicit `statuses` argument is passed. The hotspot endpoint surfaces
 * `TO_REVIEW` (open work) and `REVIEWED` items; `REVIEWED` items carry a
 * `resolution` axis (`SAFE` / `FIXED` / `ACKNOWLEDGED`). The default
 * filter keeps work the agent can act on (`TO_REVIEW` plus
 * `REVIEWED+ACKNOWLEDGED`, where the maintainer accepted the risk and
 * left the hotspot in place) and drops disposed-as-safe outcomes
 * (`REVIEWED+SAFE`, `REVIEWED+FIXED`) which would only add noise.
 *
 * Frozen so the default cannot be mutated by a caller.
 */
export const DEFAULT_HOTSPOT_LIFECYCLE_STATUSES = Object.freeze([
  'TO_REVIEW',
  'REVIEWED+ACKNOWLEDGED',
]);

/**
 * JSON envelope schema version, surfaced as `meta.schemaVersion` in the
 * `--json` output. This is the agent contract; bumping it is a consumer-
 * visible breaking change.
 */
export const SCHEMA_VERSION = 1;

/**
 * On-disk cache schema version, embedded as `schemaVersion` at the top of
 * `.sonar-cache/cache.json`. Independent from `SCHEMA_VERSION` because the
 * cache is a private, disposable artefact: a shape change here costs one
 * extra fetch on first-run after the bump (bump-and-discard), no migration.
 *
 * Bumped from 1 to 2 when the cache key gained an `endpoint` discriminator
 * to share one cache file between the issues and hotspots endpoints.
 */
export const CACHE_SCHEMA_VERSION = 2;

/**
 * Extracts `sonarCloudOrganization` and `projectKey` from the parsed
 * `.sonarlint/connectedMode.json` payload. Throws when either field is
 * missing or non-string — the script cannot continue without both.
 *
 * @param {unknown} json - parsed JSON object
 * @returns {{ organization: string, projectKey: string }}
 */
export function parseConnectedMode(json) {
  if (json === null || typeof json !== 'object') {
    throw new Error('connectedMode.json is not an object');
  }
  const organization = /** @type {Record<string, unknown>} */ (json).sonarCloudOrganization;
  const projectKey = /** @type {Record<string, unknown>} */ (json).projectKey;
  if (typeof organization !== 'string' || organization.length === 0) {
    throw new Error('connectedMode.json is missing sonarCloudOrganization');
  }
  if (typeof projectKey !== 'string' || projectKey.length === 0) {
    throw new Error('connectedMode.json is missing projectKey');
  }
  return { organization, projectKey };
}

// === Issues surface ===

/**
 * Constructs the `/api/issues/search` URL for SonarCloud. Uses the
 * verified-working `componentKeys=<projectKey>:<filepath>` shape; the
 * older `fileKeys=` parameter is silently ignored on SonarCloud and is
 * not used here (see ADR-0042 risk-mitigation note).
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.projectKey
 * @param {readonly string[]} [input.files] - relative paths; empty list
 *   queries the whole project
 * @param {number} [input.page] - 1-based page index
 * @param {number} [input.pageSize] - issues per page
 * @param {string} [input.statuses] - comma-separated SonarCloud statuses
 * @returns {string} fully encoded URL
 */
export function buildIssuesUrl(input) {
  const baseUrl = input.baseUrl ?? SONARCLOUD_BASE_URL;
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const statuses = input.statuses ?? DEFAULT_STATUSES;
  const params = new URLSearchParams();
  if (Array.isArray(input.files) && input.files.length > 0) {
    const componentKeys = input.files.map((file) => `${input.projectKey}:${file}`).join(',');
    params.set('componentKeys', componentKeys);
  } else {
    params.set('componentKeys', input.projectKey);
  }
  params.set('p', String(page));
  params.set('ps', String(pageSize));
  params.set('statuses', statuses);
  return `${baseUrl}/api/issues/search?${params.toString()}`;
}

/**
 * Strips the `<projectKey>:` prefix from a SonarCloud component string,
 * returning the bare filepath. Returns the input unchanged when the
 * prefix is absent (defensive — the script never receives such payloads
 * from the verified API shape, but a future API change should not throw).
 *
 * @param {string} component
 * @param {string} projectKey
 * @returns {string}
 */
function stripComponentPrefix(component, projectKey) {
  const prefix = `${projectKey}:`;
  if (component.startsWith(prefix)) {
    return component.slice(prefix.length);
  }
  return component;
}

/**
 * Projects a single raw SonarCloud issue object to the normalised finding
 * shape, or returns `null` when the entry is not an object. Splitting this
 * out keeps `parseIssuesResponse` below the cognitive-complexity ceiling
 * and lets the loop body read as a straight map+filter.
 *
 * @param {unknown} issue - one element of the API's `issues` array
 * @param {string} projectKey - used to strip the component prefix
 * @returns {{ rule: string, severity: string, file: string, line: number, message: string, status: string } | null}
 */
export function mapIssueToFinding(issue, projectKey) {
  if (issue === null || typeof issue !== 'object') {
    return null;
  }
  const record = /** @type {Record<string, unknown>} */ (issue);
  const rule = typeof record.rule === 'string' ? record.rule : '';
  const severity = typeof record.severity === 'string' ? record.severity : 'UNKNOWN';
  const componentRaw = typeof record.component === 'string' ? record.component : '';
  const file = stripComponentPrefix(componentRaw, projectKey);
  const lineRaw = record.line;
  const line = typeof lineRaw === 'number' && Number.isFinite(lineRaw) ? lineRaw : 0;
  const message = typeof record.message === 'string' ? record.message : '';
  const status = typeof record.status === 'string' ? record.status : 'UNKNOWN';
  return { rule, severity, file, line, message, status };
}

/**
 * Deterministic comparator for the findings list: primary key file, then
 * line, then rule. Pulled out so `parseIssuesResponse` reads as a pure
 * map+sort and the comparator itself is independently testable. The same
 * comparator orders hotspot findings — both shapes carry `file`, `line`,
 * and `rule`.
 *
 * @param {{ file: string, line: number, rule: string }} a
 * @param {{ file: string, line: number, rule: string }} b
 * @returns {number}
 */
export function compareFindings(a, b) {
  const fileCmp = a.file.localeCompare(b.file);
  if (fileCmp !== 0) return fileCmp;
  if (a.line !== b.line) return a.line - b.line;
  return a.rule.localeCompare(b.rule);
}

/**
 * Parses the SonarCloud `/api/issues/search` response into the normalised
 * findings array consumed by the formatters. Tolerates absence of optional
 * fields (`impacts`, `cleanCodeAttribute`, `effort`); throws when the
 * required `issues` array is absent — that signals a structural API
 * change the parser cannot handle.
 *
 * @param {unknown} payload - the parsed JSON response
 * @param {object} [options]
 * @param {string} [options.projectKey] - used to strip the component prefix
 * @returns {Array<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>}
 */
export function parseIssuesResponse(payload, options = {}) {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('SonarCloud response is not an object');
  }
  const issues = /** @type {Record<string, unknown>} */ (payload).issues;
  if (!Array.isArray(issues)) {
    throw new TypeError('SonarCloud response is missing the issues array');
  }
  const projectKey = options.projectKey ?? '';
  const findings = [];
  for (const issue of issues) {
    const finding = mapIssueToFinding(issue, projectKey);
    if (finding !== null) {
      findings.push(finding);
    }
  }
  findings.sort(compareFindings);
  return findings;
}

// === Hotspots surface ===

/**
 * Constructs the `/api/hotspots/search` URL for SonarCloud. The endpoint's
 * parameter contract differs from `/api/issues/search`: project scoping
 * uses `projectKey=` (not `componentKeys=`) and file scoping uses `files=`
 * (a comma-separated list of bare paths, not `componentKeys=<projectKey>:
 * <filepath>`). Crucially, the endpoint accepts neither `status=` nor
 * `resolution=` — passing either returns HTTP 400. Lifecycle filtering
 * runs post-fetch via `filterHotspotsByDefaultStatus`. See ADR-0042 for
 * the full empirical-finding background.
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.projectKey
 * @param {readonly string[]} [input.files] - bare relative paths; empty
 *   list queries the whole project
 * @param {number} [input.page] - 1-based page index
 * @param {number} [input.pageSize] - hotspots per page
 * @returns {string} fully encoded URL
 */
export function buildHotspotsUrl(input) {
  const baseUrl = input.baseUrl ?? SONARCLOUD_BASE_URL;
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_HOTSPOTS_PAGE_SIZE;
  const params = new URLSearchParams();
  params.set('projectKey', input.projectKey);
  if (Array.isArray(input.files) && input.files.length > 0) {
    params.set('files', input.files.join(','));
  }
  params.set('p', String(page));
  params.set('ps', String(pageSize));
  return `${baseUrl}/api/hotspots/search?${params.toString()}`;
}

/**
 * Joins a hotspot's `status` and optional `resolution` into the single
 * normalised label exposed on the agent surface. `TO_REVIEW` returns
 * unchanged. `REVIEWED` joins with the resolution
 * (`'REVIEWED+SAFE'` / `'REVIEWED+FIXED'` / `'REVIEWED+ACKNOWLEDGED'`);
 * a `REVIEWED` entry without a resolution returns the bare label
 * (defensive — the API always sets a resolution alongside `REVIEWED`,
 * but the parser does not throw on the unexpected shape).
 *
 * @param {string} status
 * @param {string | undefined} resolution
 * @returns {string}
 */
function joinHotspotStatus(status, resolution) {
  if (status === 'REVIEWED' && typeof resolution === 'string' && resolution.length > 0) {
    return `${status}+${resolution}`;
  }
  return status;
}

/**
 * Projects a single raw SonarCloud hotspot object to the normalised
 * hotspot-finding shape, or returns `null` when the entry is not an
 * object. Mirrors `mapIssueToFinding`'s extraction-point split so the
 * caller stays below the cognitive-complexity ceiling.
 *
 * The output shape exposes six fields, mirroring the issues-path mapper:
 * `rule` (renamed from the API's `ruleKey`), `file` (component with the
 * `<projectKey>:` prefix stripped), `line`, `message`,
 * `vulnerabilityProbability`, and the joined `status` label. Fields
 * dropped from the SonarCloud payload (`key`, `project`, `author`,
 * `creationDate`, `updateDate`, `flows`, `textRange.startOffset`,
 * `textRange.endOffset`, `securityCategory`) are documented in ADR-0042.
 *
 * @param {unknown} hotspot - one element of the API's `hotspots` array
 * @param {string} projectKey - used to strip the component prefix
 * @returns {{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string } | null}
 */
export function mapHotspotToFinding(hotspot, projectKey) {
  if (hotspot === null || typeof hotspot !== 'object') {
    return null;
  }
  const record = /** @type {Record<string, unknown>} */ (hotspot);
  const rule = typeof record.ruleKey === 'string' ? record.ruleKey : '';
  const componentRaw = typeof record.component === 'string' ? record.component : '';
  const file = stripComponentPrefix(componentRaw, projectKey);
  const lineRaw = record.line;
  const line = typeof lineRaw === 'number' && Number.isFinite(lineRaw) ? lineRaw : 0;
  const message = typeof record.message === 'string' ? record.message : '';
  const vulnerabilityProbability =
    typeof record.vulnerabilityProbability === 'string'
      ? record.vulnerabilityProbability
      : 'UNKNOWN';
  const statusRaw = typeof record.status === 'string' ? record.status : 'UNKNOWN';
  const resolution = typeof record.resolution === 'string' ? record.resolution : undefined;
  const status = joinHotspotStatus(statusRaw, resolution);
  return { rule, file, line, message, vulnerabilityProbability, status };
}

/**
 * Parses the SonarCloud `/api/hotspots/search` response into the
 * normalised hotspot-findings array consumed by the formatters and the
 * lifecycle filter. Tolerates absence of optional fields (`message`,
 * `line`, `resolution`); throws when the required `hotspots` array is
 * absent — that signals a structural API change the parser cannot handle.
 *
 * @param {unknown} payload - the parsed JSON response
 * @param {object} [options]
 * @param {string} [options.projectKey] - used to strip the component prefix
 * @returns {Array<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>}
 */
export function parseHotspotsResponse(payload, options = {}) {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('SonarCloud response is not an object');
  }
  const hotspots = /** @type {Record<string, unknown>} */ (payload).hotspots;
  if (!Array.isArray(hotspots)) {
    throw new TypeError('SonarCloud response is missing the hotspots array');
  }
  const projectKey = options.projectKey ?? '';
  const findings = [];
  for (const hotspot of hotspots) {
    const finding = mapHotspotToFinding(hotspot, projectKey);
    if (finding !== null) {
      findings.push(finding);
    }
  }
  findings.sort(compareFindings);
  return findings;
}

/**
 * Drops hotspot findings whose joined `status` label is not in the
 * keep-list. Default keep-list is
 * `DEFAULT_HOTSPOT_LIFECYCLE_STATUSES`: `TO_REVIEW` and
 * `REVIEWED+ACKNOWLEDGED`. Disposed-as-safe outcomes
 * (`REVIEWED+SAFE`, `REVIEWED+FIXED`) drop out as noise. Pass an explicit
 * `statuses` array to override.
 *
 * Returns a new array; does not mutate the input.
 *
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} hotspots
 * @param {readonly string[]} [statuses] - keep-list of joined status
 *   labels; defaults to `DEFAULT_HOTSPOT_LIFECYCLE_STATUSES`
 * @returns {Array<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>}
 */
export function filterHotspotsByDefaultStatus(hotspots, statuses) {
  const keepList = statuses ?? DEFAULT_HOTSPOT_LIFECYCLE_STATUSES;
  return hotspots.filter((hotspot) => keepList.includes(hotspot.status));
}

// === Output, cache, error classification ===

/**
 * Builds the `meta` block for the JSON envelope and pretty banner. The
 * shape is pinned in the concept's "Error contract" section: schema
 * version, snapshot info, warnings array. Identical on success and
 * transient-error paths so machine consumers parse one shape regardless
 * of outcome.
 *
 * Note: the script does not report a per-analysis timestamp because the
 * SonarCloud `/api/issues/search` endpoint this script targets does not
 * expose one. The snapshot-vs-live distinction is conveyed by the
 * Limitations text in DEVELOPMENT.md and ADR-0042, not by a per-run
 * timestamp.
 *
 * `hotspotsIncluded` reflects whether the run opted into the
 * `--include-hotspots` flag. It is an additive, non-breaking field at
 * `meta.schemaVersion: 1` (consumers that ignore unknown fields per
 * standard JSON-handling norm are unaffected).
 *
 * @param {object} input
 * @param {string} input.projectKey
 * @param {string} input.branch
 * @param {string} input.queryTimestamp
 * @param {boolean} input.fromCache
 * @param {number | null} input.cacheAgeSeconds
 * @param {boolean} input.hotspotsIncluded
 * @param {readonly string[]} input.warnings
 * @returns {{ schemaVersion: number, snapshotInfo: object, warnings: string[] }}
 */
export function buildMeta(input) {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotInfo: {
      projectKey: input.projectKey,
      branch: input.branch,
      queryTimestamp: input.queryTimestamp,
      fromCache: input.fromCache,
      cacheAgeSeconds: input.cacheAgeSeconds,
      hotspotsIncluded: input.hotspotsIncluded,
    },
    warnings: [...input.warnings],
  };
}

/**
 * Appends the human-readable hotspot section to the existing pretty
 * output. Header is `Security Hotspots:`; an empty input yields the
 * single line `(no hotspots)`. Each entry mirrors the issues
 * pretty-printer's two-line block: `  <rule>  [<probability>]  <file>:
 * <line>` followed by `    <message>`. Pulled out so `formatPretty` reads
 * as one branch per surface.
 *
 * @param {string[]} lines - mutated in place with the hotspot section
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} hotspots
 */
function appendHotspotSection(lines, hotspots) {
  lines.push('', 'Security Hotspots:');
  if (hotspots.length === 0) {
    lines.push('(no hotspots)');
    return;
  }
  for (const hotspot of hotspots) {
    const location = hotspot.line > 0 ? `${hotspot.file}:${hotspot.line}` : hotspot.file;
    lines.push(
      `  ${hotspot.rule}  [${hotspot.vulnerabilityProbability}]  ${location}`,
      `    ${hotspot.message}`,
    );
  }
}

/**
 * Pretty-printer for the human-readable path. Emits a banner naming the
 * project and branch, optionally annotated with the cache age, followed
 * by either an "(no findings)" line or a findings table sorted by
 * `(file, line, rule)`. When `meta.snapshotInfo.hotspotsIncluded` is
 * true, appends a `Security Hotspots:` section below the issues table
 * (the section header and entry layout are pinned by ADR-0042). The
 * banner does not claim a per-analysis timestamp; SonarCloud's
 * `/api/issues/search` endpoint does not supply one. The
 * snapshot-vs-live distinction is documented in DEVELOPMENT.md and
 * ADR-0042.
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: { projectKey: string, branch: string, queryTimestamp: string, fromCache: boolean, cacheAgeSeconds: number | null, hotspotsIncluded: boolean }, warnings: readonly string[] }} meta
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} [hotspots]
 * @returns {string}
 */
export function formatPretty(findings, meta, hotspots = []) {
  const lines = [];
  const snapshot = meta.snapshotInfo;
  const cacheNote = snapshot.fromCache ? ` (cached, ${snapshot.cacheAgeSeconds ?? 0}s old)` : '';
  lines.push(
    `SonarCloud findings for project ${snapshot.projectKey} on branch ${snapshot.branch}${cacheNote}`,
  );
  for (const warning of meta.warnings) {
    lines.push(`! ${warning}`);
  }
  lines.push('');
  if (findings.length === 0) {
    lines.push('(no findings)');
  } else {
    for (const finding of findings) {
      const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
      lines.push(`  ${finding.rule}  [${finding.severity}]  ${location}`, `    ${finding.message}`);
    }
  }
  if (snapshot.hotspotsIncluded) {
    appendHotspotSection(lines, hotspots);
  }
  return lines.join('\n');
}

/**
 * Stable JSON envelope. Top-level shape is `{ meta, findings }` regardless
 * of success or transient-error path. When
 * `meta.snapshotInfo.hotspotsIncluded` is true, the envelope additionally
 * carries a top-level `hotspots` array (absent otherwise — the no-flag
 * path stays byte-compatible with consumers written before the hotspot
 * extension). Consumers can `jq '.findings'`, `jq '.hotspots // []'`, or
 * `jq '.meta.warnings'` without conditional logic.
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: { hotspotsIncluded: boolean }, warnings: readonly string[] }} meta
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} [hotspots]
 * @returns {string} pretty-printed JSON, no trailing newline
 */
export function formatJson(findings, meta, hotspots = []) {
  /** @type {Record<string, unknown>} */
  const envelope = {
    meta,
    findings: findings.map((finding) => ({
      rule: finding.rule,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      message: finding.message,
      status: finding.status,
    })),
  };
  if (meta.snapshotInfo.hotspotsIncluded) {
    envelope.hotspots = hotspots.map((hotspot) => ({
      rule: hotspot.rule,
      file: hotspot.file,
      line: hotspot.line,
      message: hotspot.message,
      vulnerabilityProbability: hotspot.vulnerabilityProbability,
      status: hotspot.status,
    }));
  }
  return JSON.stringify(envelope, null, 2);
}

/**
 * Deterministic cache key for a fetch tuple. The `endpoint` discriminator
 * partitions issues and hotspots cache entries under the shared
 * `.sonar-cache/cache.json` file so a hotspot fetch never overwrites an
 * issues entry that happens to share a `(files, pageSize)` tuple.
 *
 * Sort the file list before joining so that two invocations with the same
 * file set in different orders share a cache entry.
 *
 * Key shapes:
 *   - issues:   `'issues::<sortedFiles>::<statuses>::<pageSize>'`
 *   - hotspots: `'hotspots::<sortedFiles>::<pageSize>'` (no `statuses`
 *     axis — the endpoint accepts no `status=` URL parameter and the
 *     lifecycle filter runs post-fetch)
 *
 * The `statuses` argument is required for `endpoint: 'issues'` and
 * ignored for `endpoint: 'hotspots'`.
 *
 * @param {{ endpoint: 'issues' | 'hotspots', files: readonly string[], statuses?: string, pageSize: number }} input
 * @returns {string}
 */
export function cacheKeyOf(input) {
  const sortedFiles = [...input.files].sort((a, b) => a.localeCompare(b));
  const segments = [input.endpoint, sortedFiles.join('|')];
  if (input.endpoint === 'issues') {
    segments.push(input.statuses ?? '');
  }
  segments.push(String(input.pageSize));
  return segments.join('::');
}

/**
 * TTL check. A cache entry is fresh when its `fetchedAt` timestamp is no
 * older than `ttlMs` relative to `now`. Negative `ttlMs` and missing
 * timestamps fail fresh.
 *
 * @param {{ fetchedAt: number } | null | undefined} cacheEntry
 * @param {number} now - epoch ms
 * @param {number} ttlMs
 * @returns {boolean}
 */
export function isCacheFresh(cacheEntry, now, ttlMs) {
  if (cacheEntry === null || cacheEntry === undefined) return false;
  if (typeof cacheEntry.fetchedAt !== 'number') return false;
  if (ttlMs < 0) return false;
  return now - cacheEntry.fetchedAt <= ttlMs;
}

/**
 * Defensive cache-file parser. Validates both the JSON shape and the
 * embedded `schemaVersion`; the runner uses the tagged result to decide
 * between silent cache miss and a warning-emitting bump-and-discard.
 *
 * Result shape:
 *   `{ ok: true, entries }` — parsed cleanly and the schema version
 *     matches `CACHE_SCHEMA_VERSION`.
 *   `{ ok: false, reason: 'parse-error' }` — JSON.parse threw.
 *   `{ ok: false, reason: 'shape' }` — root is not an object, or the
 *     `entries` field is missing or not an object.
 *   `{ ok: false, reason: 'version-missing' }` — no `schemaVersion`
 *     field; treat as a pre-versioning v0 cache and discard.
 *   `{ ok: false, reason: 'version-mismatch', actualVersion }` —
 *     `schemaVersion` present but unequal to `CACHE_SCHEMA_VERSION`.
 *
 * The cache is best-effort by design (concept § Error contract,
 * "Cache file corrupt" row); every failure path collapses to a fresh
 * fetch on the runner side.
 *
 * @param {string} text - raw file contents
 * @returns {(
 *   | { ok: true, entries: Record<string, { fetchedAt: number, payload: unknown }> }
 *   | { ok: false, reason: 'parse-error' }
 *   | { ok: false, reason: 'shape' }
 *   | { ok: false, reason: 'version-missing' }
 *   | { ok: false, reason: 'version-mismatch', actualVersion: unknown }
 * )}
 */
export function parseCacheEntry(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse-error' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'shape' };
  }
  const root = /** @type {Record<string, unknown>} */ (parsed);
  if (!('schemaVersion' in root)) {
    return { ok: false, reason: 'version-missing' };
  }
  if (root.schemaVersion !== CACHE_SCHEMA_VERSION) {
    return { ok: false, reason: 'version-mismatch', actualVersion: root.schemaVersion };
  }
  const entries = root.entries;
  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
    return { ok: false, reason: 'shape' };
  }
  return {
    ok: true,
    entries: /** @type {Record<string, { fetchedAt: number, payload: unknown }>} */ (entries),
  };
}

/**
 * Resolves the seven-row default-input edge-case matrix from the concept
 * doc. Detection runs before the fetch; first matching row wins.
 *
 * Tags returned:
 *   'on-main', 'empty-diff', 'detached-orphan', 'orphan',
 *   'main-missing', 'submodule-stripped', 'rename-tracked',
 *   'deletion-stripped', 'ok'.
 *
 * @param {object} input
 * @param {string} input.branch - resolved branch name or 'detached@<sha>'
 * @param {boolean} input.isDetached
 * @param {boolean} input.mainExists
 * @param {boolean} input.masterExists
 * @param {boolean} input.mergeBaseResolved
 * @param {readonly { status: string, oldPath: string | null, newPath: string, similarityScore: number | null, isSubmodule: boolean }[]} input.diffEntries
 * @returns {{ behaviourTag: string, warnings: string[], files: string[] }}
 */
export function classifyDiffEdgeCase(input) {
  const warnings = [];

  if (!input.mainExists && !input.masterExists) {
    warnings.push(
      'local branch main not found (master also missing); pass --default-branch=<name>, --files, or --all.',
    );
    return { behaviourTag: 'main-missing', warnings, files: [] };
  }

  if (!input.isDetached && input.branch === 'main') {
    warnings.push(
      'current branch is main; git diff main...HEAD is empty by definition. Pass --files <paths> or --all to query.',
    );
    return { behaviourTag: 'on-main', warnings, files: [] };
  }

  if (!input.mergeBaseResolved) {
    if (input.isDetached) {
      warnings.push(
        'no shared ancestor between detached HEAD and main; cannot derive a diff. Pass --files or --all to query.',
      );
      return { behaviourTag: 'detached-orphan', warnings, files: [] };
    }
    warnings.push(
      'no shared ancestor between current branch and main; cannot derive a diff. Pass --files or --all to query.',
    );
    return { behaviourTag: 'orphan', warnings, files: [] };
  }

  const submodulePaths = input.diffEntries
    .filter((entry) => entry.isSubmodule)
    .map((entry) => entry.newPath);
  if (submodulePaths.length > 0) {
    warnings.push(
      `skipping submodule path(s) ${submodulePaths.join(', ')}; SonarCloud findings live in the submodule project, not this one.`,
    );
  }

  const deletionPaths = input.diffEntries
    .filter((entry) => entry.status === 'D')
    .map((entry) => entry.newPath);
  if (deletionPaths.length > 0) {
    warnings.push(
      `dropping deleted path(s) ${deletionPaths.join(', ')} from file set; SonarCloud findings only exist for paths present at last analysis.`,
    );
  }

  const partialRenames = input.diffEntries.filter((entry) => {
    return (
      entry.status === 'R' &&
      entry.oldPath !== null &&
      typeof entry.similarityScore === 'number' &&
      entry.similarityScore < 100
    );
  });
  for (const rename of partialRenames) {
    warnings.push(
      `treating ${rename.newPath} as renamed from ${rename.oldPath ?? ''}; querying SonarCloud for the new path only (Sonar tracks per current path).`,
    );
  }

  const files = input.diffEntries
    .filter((entry) => entry.status !== 'D' && !entry.isSubmodule)
    .map((entry) => entry.newPath);

  if (files.length === 0) {
    warnings.push(
      'no files in branch diff against main; pass --files or --all to query explicitly.',
    );
    return { behaviourTag: 'empty-diff', warnings, files: [] };
  }

  return { behaviourTag: 'ok', warnings, files };
}

/**
 * Routes an HTTP-status failure to its (stderr, warning, allowStaleCache)
 * triple. Pulled out of `classifyError` so the parent stays a thin
 * dispatcher and this function holds the HTTP-status branching alone.
 *
 * @param {object} input
 * @param {number | null} input.httpStatus
 * @param {string} input.projectKey
 * @param {boolean} input.tokenSet
 * @param {string} [input.retryAfter]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean } | null}
 */
function classifyHttpError(input) {
  const status = input.httpStatus;
  if (status === 401 && input.tokenSet) {
    return {
      stderr:
        'SonarCloud rejected the configured SONAR_TOKEN (HTTP 401). Regenerate the token; see DEVELOPMENT.md.',
      warning: 'sonarcloud rejected SONAR_TOKEN (HTTP 401)',
      allowStaleCache: true,
    };
  }
  if (status === 401) {
    return {
      stderr:
        'SONAR_TOKEN not set; SonarCloud rejected the unauthenticated query. Set SONAR_TOKEN in .env.local.',
      warning: 'unauthenticated query rejected (HTTP 401); set SONAR_TOKEN',
      allowStaleCache: true,
    };
  }
  if (status === 403) {
    return {
      stderr: `SonarCloud denied access to project ${input.projectKey} (HTTP 403). Token may lack read scope.`,
      warning: `sonarcloud denied access to ${input.projectKey} (HTTP 403)`,
      allowStaleCache: true,
    };
  }
  if (status === 404) {
    return {
      stderr: `SonarCloud project ${input.projectKey} not found (HTTP 404). Check .sonarlint/connectedMode.json.`,
      warning: `sonarcloud project ${input.projectKey} not found (HTTP 404)`,
      allowStaleCache: false,
    };
  }
  if (status === 429) {
    const retry = input.retryAfter ?? 'unknown';
    return {
      stderr: `SonarCloud rate-limited (HTTP 429); using cached results if available. Retry-After: ${retry}.`,
      warning: `sonarcloud rate-limited (HTTP 429); retry-after ${retry}`,
      allowStaleCache: true,
    };
  }
  if (typeof status === 'number' && status >= 500) {
    return {
      stderr: `SonarCloud server error (HTTP ${status}); using cached results if available.`,
      warning: `sonarcloud server error (HTTP ${status})`,
      allowStaleCache: true,
    };
  }
  return null;
}

/**
 * Resolves the failure-mode matrix from the concept's "Error contract"
 * section. Returns the routing decision used by the CLI runner: stderr
 * line, machine-readable warning, and whether stale cache is acceptable
 * as fallback.
 *
 * @param {object} input
 * @param {string} input.errorKind - 'http' | 'network' | 'auth-missing'
 * @param {number | null} input.httpStatus
 * @param {string} input.projectKey
 * @param {boolean} input.tokenSet
 * @param {string} [input.retryAfter]
 * @param {string} [input.message]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean }}
 */
export function classifyError(input) {
  if (input.errorKind === 'http') {
    const httpResult = classifyHttpError(input);
    if (httpResult !== null) return httpResult;
  }
  if (input.errorKind === 'network') {
    const detail = input.message ?? 'unknown';
    return {
      stderr: `Network error reaching sonarcloud.io: ${detail}.`,
      warning: `network error reaching sonarcloud.io: ${detail}`,
      allowStaleCache: true,
    };
  }
  if (input.errorKind === 'auth-missing') {
    return {
      stderr: 'SONAR_TOKEN not set; querying SonarCloud unauthenticated (public-project default).',
      warning: 'unauthenticated query (no SONAR_TOKEN)',
      allowStaleCache: false,
    };
  }
  const detail = input.message ?? 'unspecified';
  return {
    stderr: `Unexpected SonarCloud error: ${detail}.`,
    warning: `unexpected sonarcloud error: ${detail}`,
    allowStaleCache: true,
  };
}
