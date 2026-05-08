/**
 * Hotspots-endpoint surface for the agent-side SonarCloud findings query.
 *
 * What lives here:
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
 *
 * What does NOT live here:
 *   - Shared infrastructure (cache helpers, error classifier, formatters,
 *     `compareFindings`, `parseConnectedMode`, etc.) stays in `query.mjs`
 *     so multiple endpoint modules can reuse it without circular imports.
 *   - The pretty-printer's hotspot section (`appendHotspotSection`) lives
 *     with `formatPretty` in `query.mjs` because the orchestrator owns
 *     the section-stacking order across endpoints.
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/hotspots.test.mjs (unit tests)
 */

import { compareFindings, SONARCLOUD_BASE_URL, stripComponentPrefix } from './query.mjs';

/** @typedef {import('./query.mjs').BranchAxis} BranchAxis */

/**
 * Default page size for the `/api/hotspots/search` endpoint. Mirrors
 * `DEFAULT_ISSUES_PAGE_SIZE` for the issues endpoint; kept as a separate
 * declaration so the two endpoints can diverge on this axis without
 * rippling through the hotspots-path call sites.
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
 * Constructs the `/api/hotspots/search` URL for SonarCloud. The endpoint's
 * parameter contract differs from `/api/issues/search`: project scoping
 * uses `projectKey=` (not `componentKeys=`) and file scoping uses `files=`
 * (a comma-separated list of bare paths, not `componentKeys=<projectKey>:
 * <filepath>`). Crucially, the endpoint accepts neither `status=` nor
 * `resolution=` — passing either returns HTTP 400. Lifecycle filtering
 * runs post-fetch via `filterHotspotsByDefaultStatus`. See ADR-0042 for
 * the full empirical-finding background.
 *
 * The `branchAxis` parameter emits either `&branch=<encoded>` (when
 * `kind === 'branch'`) or `&pullRequest=<id>` (when `kind === 'pullRequest'`)
 * per ADR-0046. The runner threads the resolved axis at the call site;
 * URL builders never default the axis silently. Mirrors `buildIssuesUrl`.
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.projectKey
 * @param {readonly string[]} [input.files] - bare relative paths; empty
 *   list queries the whole project
 * @param {number} [input.page] - 1-based page index
 * @param {number} [input.pageSize] - hotspots per page
 * @param {BranchAxis} input.branchAxis - branch or pull-request axis
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
  if (input.branchAxis.kind === 'pullRequest') {
    params.set('pullRequest', input.branchAxis.id);
  } else {
    params.set('branch', input.branchAxis.name);
  }
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
