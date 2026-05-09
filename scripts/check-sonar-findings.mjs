/**
 * CLI runner for the agent-side SonarCloud findings query.
 *
 * What this script does:
 *   Queries SonarCloud's public REST API (`/api/issues/search`) for findings
 *   on a defined file set, prints them in a human-readable table by default
 *   (or stable JSON when `--json` is passed), and exits informationally.
 *
 * What this script does NOT do:
 *   Predict findings on unpushed code. The output reflects SonarCloud's
 *   view of the last analysed branch state. The on-screen banner names the
 *   analysis basis on every run so the snapshot-vs-live distinction is
 *   visible. See docs/adr/0042-agent-side-sonarcloud-findings-query.md.
 *
 * Why this exists:
 *   ADR-0041 closed the local-prevention question for the human-in-VS-Code
 *   persona via SonarLint Connected Mode. ADR-0042 closes the equivalent
 *   gap for automated contributors who do not run VS Code: a scriptable
 *   per-file lookup that any pnpm/agent context can invoke.
 *
 * Usage:
 *   pnpm check:sonar-findings
 *   pnpm check:sonar-findings --files src/foo.ts,src/bar.ts
 *   pnpm check:sonar-findings --all
 *   pnpm check:sonar-findings --json
 *
 * Exit codes (per concept § Error contract):
 *   0 — every successful or transient-failure path (the script is a lookup,
 *       not a build gate; agent quality chains stay green on outages).
 *   1 — local-runtime fatal (malformed connectedMode.json, no git binary,
 *       file-system permission errors).
 *   2 — caller error (unknown CLI flag, conflicting flags).
 *
 * Layout:
 *   The pure-logic surface (URL builder, response parser, output formatters,
 *   cache helpers, edge-case classifier, error classifier) lives in
 *   `./sonar-findings/query.mjs` so it can be unit-tested without
 *   filesystem, subprocess, or network access. This file keeps the I/O
 *   wiring (argv parsing, git context, fetch, cache read/write, exit-code
 *   routing).
 *
 *   The runner's I/O surface is exported as `runMain(deps, argv)` so the
 *   wiring itself is unit-testable: tests substitute `deps` with in-memory
 *   equivalents in `scripts/check-sonar-findings.test.mjs`. The top-level
 *   CLI invocation at the bottom of this file is gated by an entry-point
 *   guard so importing `runMain` from a test does not re-run production
 *   side-effects.
 */

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDuplicationsShowUrl,
  buildMeasuresComponentTreeUrl,
  DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE,
  dedupeDuplicationFindings,
  MEASURES_COMPONENT_TREE_HARD_CAP_PAGES,
  mapDuplicationToFindings,
  parseDuplicationsShowResponse,
  parseMeasuresComponentTreeResponse,
} from './sonar-findings/duplications.mjs';
import {
  buildHotspotsUrl,
  DEFAULT_HOTSPOTS_PAGE_SIZE,
  filterHotspotsByDefaultStatus,
  parseHotspotsResponse,
} from './sonar-findings/hotspots.mjs';
import {
  buildIssuesUrl,
  DEFAULT_ISSUES_PAGE_SIZE,
  DEFAULT_STATUSES,
  parseIssuesResponse,
} from './sonar-findings/issues.mjs';
import {
  buildMeta,
  CACHE_SCHEMA_VERSION,
  cacheKeyOf,
  classifyDiffEdgeCase,
  classifyError,
  DEFAULT_CACHE_TTL_MS,
  formatJson,
  formatPretty,
  isCacheFresh,
  parseCacheEntry,
  parseConnectedMode,
  SONARCLOUD_BASE_URL,
  stripComponentPrefix,
} from './sonar-findings/query.mjs';

const CONNECTED_MODE_PATH = '.sonarlint/connectedMode.json';
const CACHE_DIR = '.sonar-cache';
const CACHE_FILE = join(CACHE_DIR, 'cache.json');

// ---------------------------------------------------------------------------
// Argv parser
// ---------------------------------------------------------------------------

/**
 * Splits a comma-separated list literal into the trimmed file paths the
 * `--files` flag accepts. Empty segments are dropped so trailing commas do
 * not introduce phantom paths. Pulled out to keep `applyBooleanOrValueArg`
 * and `applyInlineFlag` below the cognitive-complexity ceiling.
 *
 * @param {string} raw
 * @returns {string[]}
 */
function splitFileList(raw) {
  return raw.split(',').filter((file) => file.length > 0);
}

/**
 * Handles the `--key=value` flag family (`--files=`, `--cache-ttl-seconds=`,
 * `--default-branch=`, `--branch=`, `--pull-request=`). Returns
 * `{ matched: true, ok }` on a recognised key (with `ok: false, message`
 * on a malformed value), or `{ matched: false }` so the caller can fall
 * through to other handlers.
 *
 * @param {string} arg
 * @param {{ files: string[] | null, cacheTtlMs: number, defaultBranch: string | undefined, branchOverride: string | undefined, pullRequest: string | undefined }} options
 * @returns {{ matched: true, ok: true } | { matched: true, ok: false, message: string } | { matched: false }}
 */
function applyInlineFlag(arg, options) {
  if (arg.startsWith('--files=')) {
    options.files = splitFileList(arg.slice('--files='.length));
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--cache-ttl-seconds=')) {
    const seconds = Number(arg.slice('--cache-ttl-seconds='.length));
    if (!Number.isFinite(seconds) || seconds < 0) {
      return {
        matched: true,
        ok: false,
        message: '--cache-ttl-seconds expects a non-negative number',
      };
    }
    options.cacheTtlMs = seconds * 1000;
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--default-branch=')) {
    options.defaultBranch = arg.slice('--default-branch='.length);
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--branch=')) {
    const value = arg.slice('--branch='.length);
    if (value.length === 0) {
      return { matched: true, ok: false, message: '--branch expects a non-empty branch name' };
    }
    options.branchOverride = value;
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--pull-request=')) {
    const value = arg.slice('--pull-request='.length);
    if (!/^\d+$/.test(value)) {
      return {
        matched: true,
        ok: false,
        message: '--pull-request expects a non-negative integer id',
      };
    }
    options.pullRequest = value;
    return { matched: true, ok: true };
  }
  return { matched: false };
}

/**
 * Handles the boolean-flag and `--files <value>` families. Returns the
 * number of argv slots consumed on success, a `help: true` signal for the
 * help flags, an `error: <message>` for malformed `--files`, or
 * `unmatched: true` so the caller can fall through to inline-flag
 * handling.
 *
 * @param {string} arg
 * @param {readonly string[]} argv
 * @param {number} i
 * @param {{ files: string[] | null, all: boolean, json: boolean, noCache: boolean, includeHotspots: boolean, includeDuplications: boolean }} options
 * @returns {{ advance: number } | { help: true } | { error: string } | { unmatched: true }}
 */
function applyBooleanOrValueArg(arg, argv, i, options) {
  if (arg === '--json') {
    options.json = true;
    return { advance: 1 };
  }
  if (arg === '--all') {
    options.all = true;
    return { advance: 1 };
  }
  if (arg === '--no-cache') {
    options.noCache = true;
    return { advance: 1 };
  }
  if (arg === '--include-hotspots') {
    options.includeHotspots = true;
    return { advance: 1 };
  }
  if (arg === '--include-duplications') {
    options.includeDuplications = true;
    return { advance: 1 };
  }
  if (arg === '--help' || arg === '-h') {
    return { help: true };
  }
  if (arg === '--files') {
    const next = argv[i + 1];
    if (next === undefined) {
      return { error: '--files requires a comma-separated list of paths' };
    }
    options.files = splitFileList(next);
    return { advance: 2 };
  }
  return { unmatched: true };
}

/**
 * Parses CLI flags. Returns `{ ok: true, options }` on success or
 * `{ ok: false, message }` on a caller error (unknown flag, conflicting
 * flags). Pure with respect to side effects so the caller decides how to
 * report.
 */
function parseArgs(argv) {
  const options = {
    files: null,
    all: false,
    json: false,
    noCache: false,
    includeHotspots: false,
    includeDuplications: false,
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    // Initialised as `undefined` (not `null`) so that an unset flag
    // lets `collectGitContext`'s default-parameter syntax provide the
    // 'main' fallback without an explicit null-coalesce in the body.
    defaultBranch: undefined,
    // Branch-axis overrides; both default `undefined`. When neither is
    // supplied, `resolveBranchAxis` falls back to `currentBranch`.
    // `branchOverride` and `pullRequest` are mutually exclusive (m-R2-4).
    branchOverride: undefined,
    pullRequest: undefined,
  };
  for (let i = 0; i < argv.length; ) {
    const step = consumeArg(argv, i, options);
    if (step.kind === 'done') {
      return step.result;
    }
    i += step.advance;
  }
  return enforceArgConstraints(options);
}

/**
 * Single-step consumer for `parseArgs`: classifies one position in `argv`
 * into either a terminal result (help banner, parse error) or an advance
 * count for the parser loop. Mutates `options` for the matched flags so the
 * outer loop stays a thin orchestrator under the cognitive-complexity gate.
 *
 * @param {readonly string[]} argv
 * @param {number} i
 * @param {{ files: string[] | null, all: boolean, json: boolean, noCache: boolean, includeHotspots: boolean, includeDuplications: boolean }} options
 * @returns {{ kind: 'done', result: { ok: false, help: true } | { ok: false, message: string } } | { kind: 'advance', advance: number }}
 */
function consumeArg(argv, i, options) {
  const arg = argv[i];
  const primary = applyBooleanOrValueArg(arg, argv, i, options);
  if ('help' in primary) return { kind: 'done', result: { ok: false, help: true } };
  if ('error' in primary) return { kind: 'done', result: { ok: false, message: primary.error } };
  if ('advance' in primary) return { kind: 'advance', advance: primary.advance };
  const inline = applyInlineFlag(arg, options);
  if (inline.matched) {
    return inline.ok
      ? { kind: 'advance', advance: 1 }
      : { kind: 'done', result: { ok: false, message: inline.message } };
  }
  return { kind: 'done', result: { ok: false, message: `unknown flag ${arg}` } };
}

/**
 * Cross-flag validation applied after the loop in `parseArgs`. Returns the
 * success envelope when no constraint fires, or the conflict message for
 * mutually-exclusive flag pairs.
 *
 * @param {object} options
 * @returns {{ ok: true, options: object } | { ok: false, message: string }}
 */
function enforceArgConstraints(options) {
  if (options.all && options.files !== null) {
    return { ok: false, message: '--all and --files are mutually exclusive' };
  }
  if (options.branchOverride !== undefined && options.pullRequest !== undefined) {
    return { ok: false, message: '--branch and --pull-request are mutually exclusive' };
  }
  return { ok: true, options };
}

const HELP_TEXT = `Usage: pnpm check:sonar-findings [options]

Queries SonarCloud for findings on the files this branch has touched
since branching off main. Queries are scoped to the current local branch
by default; pass --branch or --pull-request to override.

Options:
  --files <a,b,c>            comma-separated list of paths (overrides default)
  --all                      query the whole project (mutually exclusive with --files)
  --json                     emit a stable JSON envelope on stdout
  --no-cache                 bypass the .sonar-cache TTL cache
  --include-hotspots         additionally fetch /api/hotspots/search and surface
                             TO_REVIEW + REVIEWED+ACKNOWLEDGED entries
  --include-duplications     additionally fetch /api/duplications/show per file
                             (and /api/measures/component_tree on --all) and surface
                             SonarCloud duplicated-block findings
  --branch=<name>            override the queried branch (default: current local branch)
  --pull-request=<n>         scope queries to the supplied pull-request id
                             (mutually exclusive with --branch)
  --cache-ttl-seconds=N      override the cache TTL (default 300)
  --default-branch=<name>    diff basis when 'main' is missing locally
  --help, -h                 show this help

Exit codes:
  0  every successful or transient-failure path
  1  local-runtime fatal (malformed connectedMode.json, file-system error)
  2  caller error (unknown flag, conflicting flags)
`;

// ---------------------------------------------------------------------------
// Production runGit (used when no test override is supplied)
// ---------------------------------------------------------------------------

/**
 * Production `runGit` implementation. Spawns the system `git` binary
 * synchronously and returns the captured exit code, stdout, and stderr.
 * Tests substitute this via `deps.runGit` with an in-memory stub.
 *
 * @param {readonly string[]} args
 * @param {{ PATH?: string }} env
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
function realRunGit(args, env) {
  const result = spawnSync('git', args, {
    encoding: 'utf-8',
    shell: false,
    // SonarCloud S4036: explicit PATH inheritance documents that the
    // PATH used to resolve `git` is the operator's own. The script
    // runs locally on developer machines; no untrusted-input path
    // mutates PATH between process start and spawn. A hardened PATH
    // (e.g. `/usr/bin:/bin`) would break Windows and macOS dev setups
    // where git lives elsewhere; absolute-path lookup would still go
    // through PATH for the lookup itself.
    env: { ...process.env, PATH: env.PATH ?? process.env.PATH },
  });
  if (result.error) {
    return { exitCode: -1, stdout: '', stderr: result.error.message };
  }
  return {
    exitCode: typeof result.status === 'number' ? result.status : -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ---------------------------------------------------------------------------
// Git context helpers (each takes only the `runGit` slice of the deps bag)
// ---------------------------------------------------------------------------

/**
 * @param {(args: readonly string[]) => { exitCode: number, stdout: string, stderr: string }} runGit
 * @param {string} ref
 */
function refExists(runGit, ref) {
  return runGit(['rev-parse', '--verify', '--quiet', ref]).exitCode === 0;
}

/**
 * @param {(args: readonly string[]) => { exitCode: number, stdout: string, stderr: string }} runGit
 */
function currentBranch(runGit) {
  const symbolic = runGit(['symbolic-ref', '-q', '--short', 'HEAD']);
  if (symbolic.exitCode === 0) {
    return { isDetached: false, branch: symbolic.stdout.trim() };
  }
  const sha = runGit(['rev-parse', '--short', 'HEAD']);
  const fragment = sha.exitCode === 0 ? sha.stdout.trim() : 'unknown';
  return { isDetached: true, branch: `detached@${fragment}` };
}

function parseDiffNameStatus(stdout) {
  const lines = stdout.split('\n').filter((line) => line.length > 0);
  const entries = [];
  for (const line of lines) {
    const parts = line.split('\t');
    const code = parts[0] ?? '';
    if (code.startsWith('R') && parts.length >= 3) {
      const score = Number(code.slice(1));
      entries.push({
        status: 'R',
        oldPath: parts[1],
        newPath: parts[2],
        similarityScore: Number.isFinite(score) ? score : null,
        isSubmodule: false,
      });
      continue;
    }
    if (code === 'D' && parts.length >= 2) {
      entries.push({
        status: 'D',
        oldPath: null,
        newPath: parts[1],
        similarityScore: null,
        isSubmodule: false,
      });
      continue;
    }
    if (parts.length >= 2) {
      entries.push({
        status: code,
        oldPath: null,
        newPath: parts[1],
        similarityScore: null,
        isSubmodule: false,
      });
    }
  }
  return entries;
}

/**
 * @param {(args: readonly string[]) => { exitCode: number, stdout: string, stderr: string }} runGit
 */
function readSubmodulePaths(runGit) {
  const result = runGit([
    'config',
    '-f',
    '.gitmodules',
    '--get-regexp',
    String.raw`submodule\..*\.path`,
  ]);
  if (result.exitCode !== 0) return new Set();
  const paths = new Set();
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const parts = trimmed.split(/\s+/);
    const last = parts.at(-1);
    if (typeof last === 'string' && last.length > 0) {
      paths.add(last);
    }
  }
  return paths;
}

/**
 * @param {(args: readonly string[]) => { exitCode: number, stdout: string, stderr: string }} runGit
 * @param {{ branch: string, isDetached: boolean }} branchInfo
 * @param {string} [defaultBranchOverride]
 */
function collectGitContext(runGit, branchInfo, defaultBranchOverride = 'main') {
  const mainExists = refExists(runGit, `refs/heads/${defaultBranchOverride}`);
  const masterExists = mainExists ? false : refExists(runGit, 'refs/heads/master');
  let baseBranch = null;
  if (mainExists) {
    baseBranch = defaultBranchOverride;
  } else if (masterExists) {
    baseBranch = 'master';
  }
  let mergeBaseResolved = false;
  if (baseBranch !== null) {
    const mergeBase = runGit(['merge-base', baseBranch, 'HEAD']);
    mergeBaseResolved = mergeBase.exitCode === 0 && mergeBase.stdout.trim().length > 0;
  }
  let diffEntries = [];
  if (baseBranch !== null && mergeBaseResolved && branchInfo.branch !== baseBranch) {
    const diff = runGit(['diff', '--name-status', '-M', `${baseBranch}...HEAD`]);
    if (diff.exitCode === 0) {
      const submodulePaths = readSubmodulePaths(runGit);
      diffEntries = parseDiffNameStatus(diff.stdout).map((entry) => ({
        ...entry,
        isSubmodule: submodulePaths.has(entry.newPath),
      }));
    }
  }
  return {
    branch: branchInfo.branch,
    isDetached: branchInfo.isDetached,
    mainExists,
    masterExists,
    mergeBaseResolved,
    diffEntries,
  };
}

// ---------------------------------------------------------------------------
// Cache I/O (each takes only the `fs` slice of the deps bag)
// ---------------------------------------------------------------------------

/**
 * Reads the on-disk cache file, validates its schema version, and returns
 * the parsed entries map plus any warnings to surface to the caller.
 *
 * Failure handling:
 *   - ENOENT (no cache yet) → silent miss (`entries: null`, no warnings).
 *   - Other read errors → push a `cache read failed: <message>` warning so
 *     a permission problem does not vanish into a "no cache" rebrand.
 *   - JSON parse / shape errors → silent miss (the file is disposable).
 *   - Schema-version mismatch / missing → bump-and-discard with a warning
 *     so a future shape change is visible on the first run after the bump.
 *
 * @param {{ readFile: (path: string, encoding: string) => Promise<string> }} fs
 * @returns {Promise<{ entries: Record<string, { fetchedAt: number, payload: unknown }> | null, warnings: string[] }>}
 */
async function readCache(fs) {
  let text;
  try {
    text = await fs.readFile(CACHE_FILE, 'utf-8');
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
      return { entries: null, warnings: [] };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { entries: null, warnings: [`cache read failed: ${message}`] };
  }
  const parsed = parseCacheEntry(text);
  if (parsed.ok) {
    return { entries: parsed.entries, warnings: [] };
  }
  if (parsed.reason === 'version-mismatch' || parsed.reason === 'version-missing') {
    const actual = parsed.reason === 'version-mismatch' ? String(parsed.actualVersion) : 'none';
    return {
      entries: null,
      warnings: [
        `cache schema mismatch (expected v${CACHE_SCHEMA_VERSION}, got v${actual}); discarding`,
      ],
    };
  }
  return { entries: null, warnings: [] };
}

/**
 * @param {{ mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} fs
 * @param {Record<string, { fetchedAt: number, payload: unknown }>} entries
 */
async function writeCache(fs, entries) {
  await fs.mkdir(dirname(CACHE_FILE), { recursive: true });
  const wrapped = { schemaVersion: CACHE_SCHEMA_VERSION, entries };
  await fs.writeFile(CACHE_FILE, JSON.stringify(wrapped, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Fetch wrapper (takes only the `fetch` slice of the deps bag)
// ---------------------------------------------------------------------------

/**
 * Fetches a SonarCloud REST URL with the optional bearer auth and
 * returns a discriminated result. Endpoint-agnostic: the same wrapper
 * serves `/api/issues/search` and `/api/hotspots/search` because the
 * auth shape, transient-error vocabulary, and response-body parser
 * (always JSON) are identical across both endpoints.
 *
 * On a non-2xx response, the helper additionally captures `responseBody`
 * as text so the caller can route through `classifyError`'s branch-aware
 * 404 row (which inspects body shape to tell "branch not analysed yet"
 * apart from "project not found"). Body-read failures are non-fatal —
 * `responseBody` is left undefined and the caller falls through to the
 * status-only arms.
 *
 * @param {(url: string, init: { headers: Record<string, string> }) => Promise<Response>} fetchImpl
 * @param {string} url
 * @param {string | undefined} token
 * @returns {Promise<{ kind: 'ok', payload: unknown } | { kind: 'http', status: number, retryAfter: string | undefined, responseBody: string | undefined } | { kind: 'network', message: string }>}
 */
async function fetchSonarApi(fetchImpl, url, token) {
  const headers = { Accept: 'application/json' };
  if (typeof token === 'string' && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response;
  try {
    response = await fetchImpl(url, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network', message };
  }
  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after') ?? undefined;
    let responseBody;
    try {
      responseBody = await response.text();
    } catch {
      responseBody = undefined;
    }
    return { kind: 'http', status: response.status, retryAfter, responseBody };
  }
  try {
    const payload = await response.json();
    return { kind: 'ok', payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network', message: `response body parse error: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Output writers (each takes only the relevant stream slice of the deps bag)
// ---------------------------------------------------------------------------

/**
 * @param {{ write: (chunk: string) => unknown }} stdout
 */
function writeOutput(stdout, findings, meta, hotspots, duplications, json) {
  if (json) {
    stdout.write(`${formatJson(findings, meta, hotspots, duplications)}\n`);
    return;
  }
  stdout.write(`${formatPretty(findings, meta, hotspots, duplications)}\n`);
}

/**
 * @param {{ write: (chunk: string) => unknown }} stderr
 */
function writeStderrLine(stderr, message) {
  if (message.length === 0) return;
  stderr.write(`${message}\n`);
}

// ---------------------------------------------------------------------------
// Connected-mode loader (takes only the `readConnectedMode` slice)
// ---------------------------------------------------------------------------

/**
 * Production `readConnectedMode` implementation. Reads
 * `.sonarlint/connectedMode.json` from disk and returns the parsed
 * connected-mode payload. Tests substitute this via
 * `deps.readConnectedMode` with a fixture-returning stub.
 *
 * @param {{ readFile: (path: string, encoding: string) => Promise<string> }} fs
 * @returns {Promise<{ organization: string, projectKey: string }>}
 */
async function realReadConnectedMode(fs) {
  const text = await fs.readFile(CONNECTED_MODE_PATH, 'utf-8');
  const parsedJson = JSON.parse(text);
  return parseConnectedMode(parsedJson);
}

/**
 * Calls `readConnectedMode` and routes any error to a stderr line plus an
 * `exitCode: 1` envelope so the caller returns without further branching.
 *
 * @param {() => Promise<{ organization: string, projectKey: string }>} readConnectedMode
 * @param {{ write: (chunk: string) => unknown }} stderr
 * @returns {Promise<{ projectKey: string } | { exitCode: number }>}
 */
async function loadConnectedModeProjectKey(readConnectedMode, stderr) {
  try {
    const connectedMode = await readConnectedMode();
    return { projectKey: connectedMode.projectKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeStderrLine(stderr, `${CONNECTED_MODE_PATH}: ${message}`);
    return { exitCode: 1 };
  }
}

/**
 * Resolves the SonarCloud branch axis for the run. Override semantics
 * (per ADR-0046 § Behaviour → Branch resolution):
 *   - `--pull-request=<n>` → `{ kind: 'pullRequest', id: <n> }`. Wins over
 *     the detached-HEAD short-circuit; the override exists precisely for
 *     the contexts where `currentBranch` returns nothing useful.
 *   - `--branch=<name>` → `{ kind: 'branch', name: <name> }`. Wins over
 *     the detached-HEAD short-circuit for the same reason.
 *   - neither, on a detached HEAD → `null`. Caller short-circuits to
 *     `(no findings)` with a warning; SonarCloud has no notion of a
 *     detached-SHA query.
 *   - neither, on a regular branch → `{ kind: 'branch', name: <local> }`.
 *
 * `parseArgs` already guarantees the `--branch` + `--pull-request` mutual
 * exclusion, so the helper does not need to re-check.
 *
 * @param {{ branchOverride: string | undefined, pullRequest: string | undefined }} options
 * @param {{ branch: string, isDetached: boolean }} branchInfo
 * @param {string[]} warnings - mutated in place when the detached-HEAD
 *   short-circuit fires
 * @returns {import('./sonar-findings/query.mjs').BranchAxis | null}
 */
function resolveBranchAxis(options, branchInfo, warnings) {
  if (options.pullRequest !== undefined) {
    return { kind: 'pullRequest', id: options.pullRequest };
  }
  if (options.branchOverride !== undefined) {
    return { kind: 'branch', name: options.branchOverride };
  }
  if (branchInfo.isDetached) {
    warnings.push(
      `detached HEAD (${branchInfo.branch}); SonarCloud cannot query a detached SHA. Pass --branch=<name> or --pull-request=<n> to override.`,
    );
    return null;
  }
  return { kind: 'branch', name: branchInfo.branch };
}

/**
 * Resolves the file set under one of three modes: `--all` (whole project),
 * explicit `--files`, or git-derived diff against the default branch. The
 * git-derived branch may classify as an "empty-diff family" edge case, in
 * which case the caller skips the API entirely.
 *
 * @param {(args: readonly string[]) => { exitCode: number, stdout: string, stderr: string }} runGit
 * @param {{ all: boolean, files: string[] | null, defaultBranch: string | undefined }} options
 * @param {{ branch: string, isDetached: boolean }} branchInfo
 * @param {string[]} warnings - mutated in place with edge-case warnings
 * @returns {{ files: readonly string[], skipApi: boolean }}
 */
function resolveFileSet(runGit, options, branchInfo, warnings) {
  if (options.all) {
    return { files: [], skipApi: false };
  }
  if (Array.isArray(options.files)) {
    return { files: options.files, skipApi: false };
  }
  const gitContext = collectGitContext(runGit, branchInfo, options.defaultBranch);
  const classification = classifyDiffEdgeCase(gitContext);
  warnings.push(...classification.warnings);
  return {
    files: classification.files,
    skipApi: classification.behaviourTag !== 'ok',
  };
}

/**
 * Reads the on-disk cache and pushes any read warnings to `warnings` (and
 * mirrors them to stderr). Returns the parsed entries map plus the entry
 * for `cacheKey`, both nullable.
 *
 * @param {{ readFile: (path: string, encoding: string) => Promise<string> }} fs
 * @param {{ write: (chunk: string) => unknown }} stderr
 * @param {{ noCache: boolean }} options
 * @param {string} cacheKey
 * @param {string[]} warnings - mutated in place
 * @returns {Promise<{ cacheEntries: Record<string, { fetchedAt: number, payload: unknown }> | null, cachedEntry: { fetchedAt: number, payload: unknown } | null }>}
 */
async function loadCacheEntries(fs, stderr, options, cacheKey, warnings) {
  if (options.noCache) {
    return { cacheEntries: null, cachedEntry: null };
  }
  const cacheRead = await readCache(fs);
  warnings.push(...cacheRead.warnings);
  for (const warning of cacheRead.warnings) {
    writeStderrLine(stderr, warning);
  }
  const cacheEntries = cacheRead.entries;
  const cachedEntry = cacheEntries === null ? null : (cacheEntries[cacheKey] ?? null);
  return { cacheEntries, cachedEntry };
}

/**
 * Persists a fresh fetch payload into the cache. A write failure becomes a
 * warning (best-effort cache; concept § Error contract) and is never fatal.
 *
 * @param {{ mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} fs
 * @param {Record<string, { fetchedAt: number, payload: unknown }> | null} cacheEntries
 * @param {string} cacheKey
 * @param {number} now
 * @param {unknown} payload
 * @param {string[]} warnings - mutated in place on failure
 */
async function persistCacheEntry(fs, cacheEntries, cacheKey, now, payload, warnings) {
  const nextEntries = cacheEntries ?? {};
  nextEntries[cacheKey] = { fetchedAt: now, payload };
  try {
    await writeCache(fs, nextEntries);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`cache write failed: ${message}`);
  }
}

/**
 * Parses a cached payload defensively. The strict response parsers throw on
 * a payload that does not match the expected shape (e.g. `{ issues: [...] }`,
 * `{ hotspots: [...] }`, `{ duplications: [...] }`, or `{ paging, components }`);
 * for cached payloads, that means the cache outlived a parser-shape change.
 * ADR-0042 collapses every cache-side mismatch to exit 0 with a warning per
 * its § Risk mitigation → Cache-corruption recovery, so we surface the
 * schema-drift warning to both stderr and the meta.warnings array and
 * return `null` so the caller falls through to its empty-result branch.
 * Mirrors the warning-prefix shape used by the transient-failure path
 * (`issues: <fragment>` / `hotspots: <fragment>` /
 * `duplications: <fragment>` / `measures-tree: <fragment>`).
 *
 * The `parser` is invoked with `(payload, parserOptions)` for the issues
 * and hotspots arms (which take a `{ projectKey }` second argument); the
 * duplications and measures-tree parsers ignore the second argument, so
 * passing `{ projectKey }` is harmless.
 *
 * @template T
 * @param {(payload: unknown, options: { projectKey: string }) => T} parser
 * @param {unknown} payload
 * @param {{ projectKey: string }} parserOptions
 * @param {'issues' | 'hotspots' | 'duplications' | 'measures-tree'} label
 * @param {'cache' | 'fresh'} source - discriminates the warning text between
 *   cached-payload re-reads and fresh-fetch responses; both arms share the
 *   same try/return/catch/warn-and-null contract.
 * @param {{ write: (chunk: string) => unknown }} stderr
 * @param {string[]} warnings - mutated in place on a parse-throw
 * @returns {T | null}
 */
function safeParsePayload(parser, payload, parserOptions, label, source, stderr, warnings) {
  try {
    return parser(payload, parserOptions);
  } catch {
    const reason =
      source === 'cache' ? 'cache payload shape invalid' : 'fresh response shape invalid';
    const message = `${label}: ${reason}; treating as empty`;
    writeStderrLine(stderr, message);
    warnings.push(message);
    return null;
  }
}

/**
 * Fetches and normalises hotspot findings for the same project + file
 * scope as the surrounding issues fetch. Reuses the issues path's
 * cache, auth, and transient-error patterns, with the hotspots-endpoint
 * cache key (no `statuses` axis) and the post-fetch lifecycle filter
 * (`TO_REVIEW` plus `REVIEWED+ACKNOWLEDGED`, drops disposed-as-safe
 * outcomes).
 *
 * Best-effort by design: any failure (cache miss + network error, or
 * fresh fetch + non-200) collapses to an empty hotspots array with the
 * classifier's stderr line and a warning appended. The issues path
 * stays unaffected — the runner returns 0 either way (concept § Error
 * contract).
 *
 * @param {object} input
 * @param {(url: string, init: { headers: Record<string, string> }) => Promise<Response>} input.fetchImpl
 * @param {{ readFile: (path: string, encoding: string) => Promise<string>, mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} input.fs
 * @param {{ write: (chunk: string) => unknown }} input.stderr
 * @param {readonly string[]} input.files
 * @param {{ noCache: boolean, cacheTtlMs: number }} input.options
 * @param {string} input.projectKey
 * @param {string | undefined} input.token
 * @param {boolean} input.tokenSet
 * @param {number} input.now
 * @param {import('./sonar-findings/query.mjs').BranchAxis} input.branchAxis -
 *   resolved branch axis threaded from `runMain` into the URL builder, the
 *   cache-key formation, and the branch-aware 404 classifier.
 * @param {Record<string, { fetchedAt: number, payload: unknown }>} input.cacheEntries -
 *   shared mutable cache-entries map threaded from `runMain`. Both the issues
 *   and hotspots paths mutate the same reference so a fresh-fetch persist on
 *   one endpoint does not clobber a fresh-fetch persist on the other when
 *   the on-disk cache started empty.
 * @param {string[]} input.warnings - mutated in place with any hotspot-
 *   specific stale-cache or transient-failure warnings
 * @returns {Promise<ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>>}
 */
async function fetchAndFilterHotspots(input) {
  const cacheKey = cacheKeyOf({
    endpoint: 'hotspots',
    branchAxis: input.branchAxis,
    files: input.files,
    pageSize: DEFAULT_HOTSPOTS_PAGE_SIZE,
  });
  const cachedEntry = input.cacheEntries[cacheKey] ?? null;
  if (!input.options.noCache && isCacheFresh(cachedEntry, input.now, input.options.cacheTtlMs)) {
    const cached = safeParsePayload(
      parseHotspotsResponse,
      cachedEntry.payload,
      { projectKey: input.projectKey },
      'hotspots',
      'cache',
      input.stderr,
      input.warnings,
    );
    return cached === null ? [] : filterHotspotsByDefaultStatus(cached);
  }
  const url = buildHotspotsUrl({
    baseUrl: SONARCLOUD_BASE_URL,
    projectKey: input.projectKey,
    files: input.files,
    page: 1,
    pageSize: DEFAULT_HOTSPOTS_PAGE_SIZE,
    branchAxis: input.branchAxis,
  });
  const fetchResult = await fetchSonarApi(input.fetchImpl, url, input.token);
  if (fetchResult.kind === 'ok') {
    const parsed = safeParsePayload(
      parseHotspotsResponse,
      fetchResult.payload,
      { projectKey: input.projectKey },
      'hotspots',
      'fresh',
      input.stderr,
      input.warnings,
    );
    if (parsed === null) {
      return [];
    }
    await persistCacheEntry(
      input.fs,
      input.cacheEntries,
      cacheKey,
      input.now,
      fetchResult.payload,
      input.warnings,
    );
    return filterHotspotsByDefaultStatus(parsed);
  }
  const classification = classifyTransientFailure(
    fetchResult,
    input.projectKey,
    input.tokenSet,
    input.branchAxis,
  );
  writeStderrLine(input.stderr, classification.stderr);
  input.warnings.push(`hotspots: ${classification.warning}`);
  if (classification.allowStaleCache && cachedEntry !== null) {
    const cached = safeParsePayload(
      parseHotspotsResponse,
      cachedEntry.payload,
      { projectKey: input.projectKey },
      'hotspots',
      'cache',
      input.stderr,
      input.warnings,
    );
    return cached === null ? [] : filterHotspotsByDefaultStatus(cached);
  }
  return [];
}

/**
 * Drives the per-file `/api/duplications/show` iteration over the supplied
 * file set. Each file's response is cached per-component (cache key
 * `'duplications::<branchAxis>::<componentKey>'` per ADR-0046, formed by
 * `cacheKeyOf` from `{ endpoint: 'duplications', componentKey, branchAxis }`),
 * mapped to per-block findings via `mapDuplicationToFindings`, deduped
 * across responses (one cluster surfaces in N responses if it spans N
 * touched files — see `dedupeDuplicationFindings`), and concatenated into
 * the final array.
 *
 * Best-effort by design: any per-file failure (HTTP 4xx/5xx, network
 * error, schema-drifted cached payload) collapses to that file's
 * contribution being empty plus a warning, exit 0 — mirrors the
 * issues + hotspots paths' transient-failure semantics. Mutates
 * `cacheEntries` and `warnings` in place.
 *
 * @param {object} input
 * @param {(url: string, init: { headers: Record<string, string> }) => Promise<Response>} input.fetchImpl
 * @param {{ readFile: (path: string, encoding: string) => Promise<string>, mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} input.fs
 * @param {{ write: (chunk: string) => unknown }} input.stderr
 * @param {readonly string[]} input.files
 * @param {{ noCache: boolean, cacheTtlMs: number }} input.options
 * @param {string} input.projectKey
 * @param {string | undefined} input.token
 * @param {boolean} input.tokenSet
 * @param {number} input.now
 * @param {import('./sonar-findings/query.mjs').BranchAxis} input.branchAxis
 * @param {Record<string, { fetchedAt: number, payload: unknown }>} input.cacheEntries
 * @param {string[]} input.warnings
 * @returns {Promise<ReadonlyArray<{ rule: string, file: string, line: number, size: number, message: string }>>}
 */
async function iterateDuplicationsPerFile(input) {
  const findings = [];
  for (const file of input.files) {
    await processDuplicationsForFile(input, file, findings);
  }
  return findings;
}

/**
 * Per-file driver for `iterateDuplicationsPerFile`. Reads the cache, falls
 * back to a fresh `/api/duplications/show` fetch on miss, and on transient
 * failure optionally re-uses the stale cached payload. Pushes the resulting
 * cluster-derived findings into the supplied accumulator. Keeping this body
 * out of the parent loop drops the parent's cognitive complexity below the
 * SonarCloud threshold.
 *
 * @param {Parameters<typeof iterateDuplicationsPerFile>[0]} input
 * @param {string} file
 * @param {Array<{ rule: string, file: string, line: number, size: number, message: string }>} findings
 * @returns {Promise<void>}
 */
async function processDuplicationsForFile(input, file, findings) {
  const componentKey = `${input.projectKey}:${file}`;
  const cacheKey = cacheKeyOf({
    endpoint: 'duplications',
    branchAxis: input.branchAxis,
    componentKey,
  });
  const cachedEntry = input.cacheEntries[cacheKey] ?? null;
  if (!input.options.noCache && isCacheFresh(cachedEntry, input.now, input.options.cacheTtlMs)) {
    appendCachedDuplicationFindings(input, cachedEntry.payload, file, findings);
    return;
  }
  const url = buildDuplicationsShowUrl({
    baseUrl: SONARCLOUD_BASE_URL,
    projectKey: input.projectKey,
    file,
    branchAxis: input.branchAxis,
  });
  const fetchResult = await fetchSonarApi(input.fetchImpl, url, input.token);
  if (fetchResult.kind === 'ok') {
    const clusters = parseDuplicationsShowResponse(fetchResult.payload);
    await persistCacheEntry(
      input.fs,
      input.cacheEntries,
      cacheKey,
      input.now,
      fetchResult.payload,
      input.warnings,
    );
    for (const cluster of clusters) {
      findings.push(...mapDuplicationToFindings(cluster, input.projectKey, file));
    }
    return;
  }
  const classification = classifyTransientFailure(
    fetchResult,
    input.projectKey,
    input.tokenSet,
    input.branchAxis,
  );
  writeStderrLine(input.stderr, classification.stderr);
  input.warnings.push(`duplications: ${classification.warning}`);
  if (classification.allowStaleCache && cachedEntry !== null) {
    appendCachedDuplicationFindings(input, cachedEntry.payload, file, findings);
  }
}

/**
 * Parses a cached duplications payload via `safeParsePayload` and pushes
 * the cluster-derived findings into the accumulator. Shared between the
 * cache-fresh path and the stale-cache fallback in
 * `processDuplicationsForFile`; both paths previously inlined the same
 * parse-and-flatten loop.
 *
 * @param {Parameters<typeof iterateDuplicationsPerFile>[0]} input
 * @param {unknown} payload
 * @param {string} file
 * @param {Array<{ rule: string, file: string, line: number, size: number, message: string }>} findings
 * @returns {void}
 */
function appendCachedDuplicationFindings(input, payload, file, findings) {
  const cached = safeParsePayload(
    parseDuplicationsShowResponse,
    payload,
    { projectKey: input.projectKey },
    'duplications',
    'cache',
    input.stderr,
    input.warnings,
  );
  if (cached === null) return;
  for (const cluster of cached) {
    findings.push(...mapDuplicationToFindings(cluster, input.projectKey, file));
  }
}

/**
 * Walks the `/api/measures/component_tree` paginator to identify
 * files-with-duplications under the resolved branch axis. Used only on
 * the `--all` short-circuit; the default and `--files` paths skip this
 * pre-fetch entirely (the touched file set is already known). Caches the
 * full list under `'measures-tree::<branchAxis>::<projectKey>::<metricKeys>'`
 * per ADR-0046 § Decision → Cache-key shapes.
 *
 * Pagination loop reads `paging.total` from the first response and
 * continues until either every page has been fetched or the
 * `MEASURES_COMPONENT_TREE_HARD_CAP_PAGES` ceiling fires; on hitting the
 * cap the helper emits a warning naming the truncation and proceeds with
 * the pages fetched so far (best-effort, exit 0). Failure on any single
 * page collapses to an empty list plus a warning, mirroring the duplications
 * path's per-file failure semantics.
 *
 * @param {object} input
 * @param {(url: string, init: { headers: Record<string, string> }) => Promise<Response>} input.fetchImpl
 * @param {{ readFile: (path: string, encoding: string) => Promise<string>, mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} input.fs
 * @param {{ write: (chunk: string) => unknown }} input.stderr
 * @param {{ noCache: boolean, cacheTtlMs: number }} input.options
 * @param {string} input.projectKey
 * @param {string | undefined} input.token
 * @param {boolean} input.tokenSet
 * @param {number} input.now
 * @param {import('./sonar-findings/query.mjs').BranchAxis} input.branchAxis
 * @param {Record<string, { fetchedAt: number, payload: unknown }>} input.cacheEntries
 * @param {string[]} input.warnings
 * @returns {Promise<readonly string[]>} bare relative file paths with `duplicated_lines > 0`
 */
async function collectFilesWithDuplications(input) {
  const metricKeys = ['duplicated_lines'];
  const cacheKey = cacheKeyOf({
    endpoint: 'measures-tree',
    branchAxis: input.branchAxis,
    projectKey: input.projectKey,
    metricKeys,
  });
  const cachedEntry = input.cacheEntries[cacheKey] ?? null;
  if (!input.options.noCache && isCacheFresh(cachedEntry, input.now, input.options.cacheTtlMs)) {
    const cached = safeParsePayload(
      parseMeasuresComponentTreeResponse,
      cachedEntry.payload,
      { projectKey: input.projectKey },
      'measures-tree',
      'cache',
      input.stderr,
      input.warnings,
    );
    return cached === null
      ? []
      : cached.files.map((entry) => stripComponentPrefix(entry.componentKey, input.projectKey));
  }
  /** @type {Array<{ componentKey: string, duplicatedLines: number }>} */
  const files = [];
  /** @type {Array<{ paging: { pageIndex: number, pageSize: number, total: number }, components: unknown[] }>} */
  const collectedPages = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MEASURES_COMPONENT_TREE_HARD_CAP_PAGES) {
    const pageResult = await fetchMeasuresComponentTreePage(input, metricKeys, page);
    if (pageResult === null) {
      return [];
    }
    files.push(...pageResult.parsed.files);
    if (page === 1) {
      totalPages = computeTotalPages(pageResult.parsed.paging, input.warnings);
    }
    collectedPages.push({
      paging: pageResult.parsed.paging,
      components: pageResult.components,
    });
    page += 1;
  }
  // Persist a synthetic combined-payload cache entry so a subsequent run
  // hits the cache without re-walking the paginator. The shape is *not*
  // bit-identical to a single SonarCloud first-page response: `paging.pageSize`
  // stays at the per-request page size while `components` carries every
  // concatenated page. `parseMeasuresComponentTreeResponse` tolerates this
  // by not cross-checking `pageSize` against `components.length`; a future
  // reader of the cache file should expect the synthetic shape, not a
  // verbatim SonarCloud snapshot.
  const combinedPayload = {
    paging: {
      pageIndex: 1,
      pageSize: DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE,
      total: collectedPages[0]?.paging.total ?? files.length,
    },
    components: collectedPages.flatMap((p) => p.components),
  };
  await persistCacheEntry(
    input.fs,
    input.cacheEntries,
    cacheKey,
    input.now,
    combinedPayload,
    input.warnings,
  );
  return files.map((entry) => stripComponentPrefix(entry.componentKey, input.projectKey));
}

/**
 * Fetches a single `/api/measures/component_tree` page and returns the
 * parsed body together with the raw `components` array for the paginator's
 * combined-payload cache entry. Returns `null` on transient failure after
 * recording the classification's stderr line and warning — the caller
 * collapses to an empty file list, mirroring the duplications path's
 * per-call best-effort semantics.
 *
 * @param {Parameters<typeof collectFilesWithDuplications>[0]} input
 * @param {readonly string[]} metricKeys
 * @param {number} page
 * @returns {Promise<{ parsed: ReturnType<typeof parseMeasuresComponentTreeResponse>, components: unknown[] } | null>}
 */
async function fetchMeasuresComponentTreePage(input, metricKeys, page) {
  const url = buildMeasuresComponentTreeUrl({
    baseUrl: SONARCLOUD_BASE_URL,
    component: input.projectKey,
    metricKeys,
    ps: DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE,
    p: page,
    branchAxis: input.branchAxis,
  });
  const fetchResult = await fetchSonarApi(input.fetchImpl, url, input.token);
  if (fetchResult.kind !== 'ok') {
    const classification = classifyTransientFailure(
      fetchResult,
      input.projectKey,
      input.tokenSet,
      input.branchAxis,
    );
    writeStderrLine(input.stderr, classification.stderr);
    input.warnings.push(`measures-tree: ${classification.warning}`);
    return null;
  }
  const parsed = parseMeasuresComponentTreeResponse(fetchResult.payload);
  const components =
    /** @type {{ components?: unknown[] }} */ (fetchResult.payload).components ?? [];
  return { parsed, components };
}

/**
 * Computes the paginator's terminating page count from the first-page
 * `paging` block, clamping to the hard cap and emitting a truncation
 * warning when SonarCloud reports more components than the cap can
 * accommodate. Extracted so the pagination loop body in
 * `collectFilesWithDuplications` stays under the cognitive-complexity gate.
 *
 * @param {{ pageSize: number, total: number }} paging
 * @param {string[]} warnings
 * @returns {number}
 */
function computeTotalPages(paging, warnings) {
  const pageSize = paging.pageSize > 0 ? paging.pageSize : 1;
  const totalPages = Math.max(1, Math.ceil(paging.total / pageSize));
  if (totalPages > MEASURES_COMPONENT_TREE_HARD_CAP_PAGES) {
    warnings.push(
      `measures-tree: pagination truncated at ${MEASURES_COMPONENT_TREE_HARD_CAP_PAGES} pages (total ${paging.total} components); raise MEASURES_COMPONENT_TREE_HARD_CAP_PAGES per ADR-0046 if needed`,
    );
  }
  return totalPages;
}

/**
 * Fetches and normalises duplications findings for the supplied file set.
 * On the default and `--files` paths, iterates `/api/duplications/show`
 * per file directly. On `--all` (signalled by an empty input file list),
 * first calls `/api/measures/component_tree` to identify
 * files-with-duplications and iterates `duplications/show` over that
 * subset only — the project's empirical duplications surface (today: 7
 * files with `duplicated_lines > 0` out of ~110 total) makes the pre-fetch
 * a 7-vs-110 round-trip win. ADR-0046 § Decision records the chained-
 * fetch shape.
 *
 * Returns the deduped findings array sorted by `(file, line, rule)` via
 * `dedupeDuplicationFindings`. Best-effort by design — see
 * `iterateDuplicationsPerFile` and `collectFilesWithDuplications` for the
 * per-call failure semantics.
 *
 * @param {object} input
 * @param {(url: string, init: { headers: Record<string, string> }) => Promise<Response>} input.fetchImpl
 * @param {{ readFile: (path: string, encoding: string) => Promise<string>, mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>, writeFile: (path: string, data: string, encoding: string) => Promise<void> }} input.fs
 * @param {{ write: (chunk: string) => unknown }} input.stderr
 * @param {readonly string[]} input.files - touched file set; empty list
 *   triggers the `--all` short-circuit's measures pre-fetch
 * @param {{ noCache: boolean, cacheTtlMs: number, all: boolean }} input.options
 * @param {string} input.projectKey
 * @param {string | undefined} input.token
 * @param {boolean} input.tokenSet
 * @param {number} input.now
 * @param {import('./sonar-findings/query.mjs').BranchAxis} input.branchAxis
 * @param {Record<string, { fetchedAt: number, payload: unknown }>} input.cacheEntries
 * @param {string[]} input.warnings
 * @returns {Promise<ReadonlyArray<{ rule: string, file: string, line: number, size: number, message: string }>>}
 */
async function fetchAndCollectDuplications(input) {
  let files = input.files;
  if (input.options.all) {
    files = await collectFilesWithDuplications(input);
  }
  if (files.length === 0) {
    return [];
  }
  const collected = await iterateDuplicationsPerFile({
    fetchImpl: input.fetchImpl,
    fs: input.fs,
    stderr: input.stderr,
    files,
    options: input.options,
    projectKey: input.projectKey,
    token: input.token,
    tokenSet: input.tokenSet,
    now: input.now,
    branchAxis: input.branchAxis,
    cacheEntries: input.cacheEntries,
    warnings: input.warnings,
  });
  return dedupeDuplicationFindings(collected);
}

/**
 * Routes a transient `fetchResult.kind !== 'ok'` outcome to the matching
 * `classifyError` triple. Pulled out so `runMain` does not have to re-derive
 * the optional fields inline.
 *
 * `branchAxis` participates in the branch-aware 404 row: the classifier
 * inspects the response body to tell "branch not analysed yet" apart from
 * "project not found" and uses the axis label in the warning. Pass
 * `undefined` for legacy call sites that have not yet been
 * branch-axis-aware migrated; the classifier falls back to the existing
 * project-not-found arm when the body match short-circuits.
 *
 * @param {{ kind: string, status?: number, retryAfter?: string, responseBody?: string, message?: string }} fetchResult
 * @param {string} projectKey
 * @param {boolean} tokenSet
 * @param {import('./sonar-findings/query.mjs').BranchAxis} [branchAxis]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean }}
 */
function classifyTransientFailure(fetchResult, projectKey, tokenSet, branchAxis) {
  return classifyError({
    errorKind: fetchResult.kind,
    httpStatus: fetchResult.kind === 'http' ? (fetchResult.status ?? null) : null,
    projectKey,
    tokenSet,
    retryAfter: fetchResult.kind === 'http' ? fetchResult.retryAfter : undefined,
    responseBody: fetchResult.kind === 'http' ? fetchResult.responseBody : undefined,
    message: fetchResult.kind === 'network' ? fetchResult.message : undefined,
    branchAxis,
  });
}

/**
 * Emits a successful (cached or fresh) findings result to the configured
 * channel. Encapsulated so the various early-return paths in `runMain` do
 * not duplicate the buildMeta+writeOutput pair. The `hotspotsIncluded` and
 * `duplicationsIncluded` booleans thread the `--include-hotspots` /
 * `--include-duplications` flag values through to the formatters; the
 * `hotspots` and `duplications` arrays carry the post-collection findings
 * for each surface (empty when the matching flag is off or when the fetch
 * failed and stale-cache fallback was unavailable).
 *
 * `pullRequest` is `null` when the run is on the branch axis,
 * `Number(options.pullRequest)` when the run is on the PR axis. Per
 * ADR-0046 § Decision → JSON envelope additivity, `branch` continues to
 * hold the resolved current local branch name in both cases — the PR id
 * surfaces only on the new sibling field.
 *
 * @param {object} input
 * @param {{ write: (chunk: string) => unknown }} input.stdout
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} input.findings
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} input.hotspots
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, size: number, message: string }>} input.duplications
 * @param {string} input.projectKey
 * @param {string} input.branch
 * @param {string} input.queryTimestamp
 * @param {boolean} input.fromCache
 * @param {number | null} input.cacheAgeSeconds
 * @param {boolean} input.hotspotsIncluded
 * @param {boolean} input.duplicationsIncluded
 * @param {number | null} input.pullRequest
 * @param {readonly string[]} input.warnings
 * @param {boolean} input.json
 */
function emitResult(input) {
  const meta = buildMeta({
    projectKey: input.projectKey,
    branch: input.branch,
    queryTimestamp: input.queryTimestamp,
    fromCache: input.fromCache,
    cacheAgeSeconds: input.cacheAgeSeconds,
    hotspotsIncluded: input.hotspotsIncluded,
    duplicationsIncluded: input.duplicationsIncluded,
    pullRequest: input.pullRequest,
    warnings: input.warnings,
  });
  writeOutput(input.stdout, input.findings, meta, input.hotspots, input.duplications, input.json);
}

/**
 * Handles a `parseArgs` result inside `runMain`: emits the help banner on
 * `--help`, writes the error message on caller-error, or returns `null` to
 * signal the parse succeeded and the runner should proceed with
 * `parsed.options`. Pulling the help/error dispatch out keeps `runMain`
 * under the cognitive-complexity gate.
 *
 * @param {{ ok: true, options: object } | { ok: false, help: true } | { ok: false, message: string }} parsed
 * @param {{ stdout: { write: (chunk: string) => unknown }, stderr: { write: (chunk: string) => unknown } }} deps
 * @returns {number | null}
 */
function handleParsedArgs(parsed, deps) {
  if (parsed.ok) return null;
  if ('help' in parsed) {
    deps.stdout.write(HELP_TEXT);
    return 0;
  }
  deps.stderr.write(`${parsed.message}\n`);
  return 2;
}

/**
 * Runs the full findings pipeline against an injectable I/O surface.
 * The CLI entry point at the bottom of this file builds a production
 * `deps` bag and calls `runMain(productionDeps, process.argv.slice(2))`;
 * tests in `scripts/check-sonar-findings.test.mjs` build an in-memory
 * deps bag and call `runMain(testDeps, [...flags])`.
 *
 * Deps shape (eight fields):
 *   - `fetch(url, init): Promise<Response>` — substitute for
 *     `globalThis.fetch`. Tests stub with `vi.fn()` returning canned
 *     responses; production wires `globalThis.fetch.bind(globalThis)`.
 *   - `fs: { readFile, writeFile, mkdir }` — file-system surface for
 *     cache and connected-mode reads. Tests pass an in-memory map-backed
 *     stub; production wires `node:fs/promises`.
 *   - `runGit(args, env): { exitCode, stdout, stderr }` — synchronous
 *     `git` subprocess wrapper. Tests stub with a function returning
 *     canned diff output; production wires `realRunGit`.
 *   - `readConnectedMode(): Promise<{ organization, projectKey }>` —
 *     loads the connected-mode descriptor. Tests stub with a constant
 *     return; production wires `() => realReadConnectedMode(fs)`.
 *   - `env: { SONAR_TOKEN?, PATH? }` — substitute for `process.env`.
 *     Tests pass a literal object; production wires `process.env`.
 *   - `stdout: { write(chunk): void }` — substitute for
 *     `process.stdout`. Tests pass an array-backed buffer; production
 *     wires `process.stdout`.
 *   - `stderr: { write(chunk): void }` — substitute for
 *     `process.stderr`. Same shape as `stdout`.
 *   - `now(): number` — substitute for `Date.now()`. Tests pass a
 *     fixed-value function for deterministic cache-age math; production
 *     wires `() => Date.now()`.
 *
 * @param {{
 *   fetch: (url: string, init: { headers: Record<string, string> }) => Promise<Response>,
 *   fs: {
 *     readFile: (path: string, encoding: string) => Promise<string>,
 *     writeFile: (path: string, data: string, encoding: string) => Promise<void>,
 *     mkdir: (path: string, opts: { recursive: boolean }) => Promise<unknown>,
 *   },
 *   runGit: (args: readonly string[], env: { PATH?: string }) => { exitCode: number, stdout: string, stderr: string },
 *   readConnectedMode: () => Promise<{ organization: string, projectKey: string }>,
 *   env: { SONAR_TOKEN?: string, PATH?: string },
 *   stdout: { write: (chunk: string) => unknown },
 *   stderr: { write: (chunk: string) => unknown },
 *   now: () => number,
 * }} deps
 * @param {readonly string[]} argv
 * @returns {Promise<number>}
 */
export async function runMain(deps, argv) {
  // Bind the env-aware `runGit` once so downstream helpers see the
  // single-argument shape they expect.
  const runGit = (args) => deps.runGit(args, deps.env);

  const parsed = parseArgs(argv);
  const handled = handleParsedArgs(parsed, deps);
  if (handled !== null) return handled;
  const options = parsed.options;

  const connectedMode = await loadConnectedModeProjectKey(deps.readConnectedMode, deps.stderr);
  if ('exitCode' in connectedMode) return connectedMode.exitCode;
  const { projectKey } = connectedMode;

  const queryTimestamp = new Date().toISOString();
  // Resolve the branch name once so the edge-case path and the happy-path
  // share a single source of truth.
  const branchInfo = currentBranch(runGit);
  const branchName = branchInfo.branch;
  const warnings = [];

  // Resolve the SonarCloud branch axis. `null` indicates a detached HEAD
  // with no override; the runner short-circuits to `(no findings)` because
  // SonarCloud has no notion of a detached-SHA query. Override flags
  // (`--branch=<name>`, `--pull-request=<n>`) win over the short-circuit
  // — they exist precisely for the contexts where `currentBranch` returns
  // nothing useful. ADR-0046 § Behaviour → Branch resolution.
  const branchAxis = resolveBranchAxis(options, branchInfo, warnings);
  const pullRequestId = options.pullRequest === undefined ? null : Number(options.pullRequest);

  if (branchAxis === null) {
    return emitEmptyShortCircuit({
      deps,
      options,
      warnings,
      projectKey,
      branchName,
      queryTimestamp,
      pullRequestId,
    });
  }

  const fileSet = resolveFileSet(runGit, options, branchInfo, warnings);
  if (fileSet.skipApi) {
    return emitEmptyShortCircuit({
      deps,
      options,
      warnings,
      projectKey,
      branchName,
      queryTimestamp,
      pullRequestId,
    });
  }
  const files = fileSet.files;

  const token = deps.env.SONAR_TOKEN;
  const tokenSet = typeof token === 'string' && token.length > 0;
  if (!tokenSet) {
    const note = classifyError({
      errorKind: 'auth-missing',
      httpStatus: null,
      projectKey,
      tokenSet: false,
    });
    warnings.push(note.warning);
    writeStderrLine(deps.stderr, note.stderr);
  }

  const cacheKey = cacheKeyOf({
    endpoint: 'issues',
    branchAxis,
    files,
    statuses: DEFAULT_STATUSES,
    pageSize: DEFAULT_ISSUES_PAGE_SIZE,
  });
  const { cacheEntries, cachedEntry } = await loadCacheEntries(
    deps.fs,
    deps.stderr,
    options,
    cacheKey,
    warnings,
  );
  // Normalise to a non-null reference so the hotspots and issues paths
  // mutate the same map. With a null reference, each `persistCacheEntry`
  // call would synthesise its own `{}` and the second `writeCache` would
  // clobber the first endpoint's fresh entry — visible whenever the
  // on-disk cache starts empty (fresh clone, cache wipe, schema
  // mismatch, or `--no-cache`).
  const sharedCacheEntries = cacheEntries ?? {};
  const now = deps.now();

  // Hotspots fetch is best-effort and decoupled from the issues path
  // (its own cache key, its own transient-error handling). The empty-
  // array fallback keeps the output shape consistent when the flag is
  // off or the hotspots fetch failed without stale-cache fallback.
  const hotspots = options.includeHotspots
    ? await fetchAndFilterHotspots({
        fetchImpl: deps.fetch,
        fs: deps.fs,
        stderr: deps.stderr,
        files,
        options,
        projectKey,
        token,
        tokenSet,
        now,
        branchAxis,
        cacheEntries: sharedCacheEntries,
        warnings,
      })
    : [];

  // Duplications fetch is best-effort and decoupled from the issues path
  // on the same shape as the hotspots fetch above. On `--all`, the helper
  // first paginates `/api/measures/component_tree` to identify
  // files-with-duplications and then iterates `/api/duplications/show`
  // over that subset only — a 7-vs-110 round-trip win on this project
  // (ADR-0046 § Decision → Endpoint shape).
  const duplications = options.includeDuplications
    ? await fetchAndCollectDuplications({
        fetchImpl: deps.fetch,
        fs: deps.fs,
        stderr: deps.stderr,
        files,
        options,
        projectKey,
        token,
        tokenSet,
        now,
        branchAxis,
        cacheEntries: sharedCacheEntries,
        warnings,
      })
    : [];

  if (!options.noCache && isCacheFresh(cachedEntry, now, options.cacheTtlMs)) {
    return emitIssuesFromCache({
      deps,
      cachedEntry,
      now,
      projectKey,
      warnings,
      options,
      hotspots,
      duplications,
      branchName,
      queryTimestamp,
      pullRequestId,
    });
  }

  // Fresh fetch.
  const url = buildIssuesUrl({
    baseUrl: SONARCLOUD_BASE_URL,
    projectKey,
    files,
    page: 1,
    pageSize: DEFAULT_ISSUES_PAGE_SIZE,
    statuses: DEFAULT_STATUSES,
    branchAxis,
  });
  const fetchResult = await fetchSonarApi(deps.fetch, url, token);

  if (fetchResult.kind === 'ok') {
    const parsed = safeParsePayload(
      parseIssuesResponse,
      fetchResult.payload,
      { projectKey },
      'issues',
      'fresh',
      deps.stderr,
      warnings,
    );
    if (parsed !== null) {
      await persistCacheEntry(
        deps.fs,
        sharedCacheEntries,
        cacheKey,
        now,
        fetchResult.payload,
        warnings,
      );
    }
    emitResult({
      stdout: deps.stdout,
      findings: parsed ?? [],
      hotspots,
      duplications,
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: false,
      cacheAgeSeconds: null,
      hotspotsIncluded: options.includeHotspots,
      duplicationsIncluded: options.includeDuplications,
      pullRequest: pullRequestId,
      warnings,
      json: options.json,
    });
    return 0;
  }

  // Transient failure path: classify, optionally fall back to stale cache.
  const classification = classifyTransientFailure(fetchResult, projectKey, tokenSet, branchAxis);
  writeStderrLine(deps.stderr, classification.stderr);
  warnings.push(classification.warning);

  if (classification.allowStaleCache && cachedEntry !== null) {
    return emitIssuesFromCache({
      deps,
      cachedEntry,
      now,
      projectKey,
      warnings,
      options,
      hotspots,
      duplications,
      branchName,
      queryTimestamp,
      pullRequestId,
    });
  }

  emitResult({
    stdout: deps.stdout,
    findings: [],
    hotspots,
    duplications,
    projectKey,
    branch: branchName,
    queryTimestamp,
    fromCache: false,
    cacheAgeSeconds: null,
    hotspotsIncluded: options.includeHotspots,
    duplicationsIncluded: options.includeDuplications,
    pullRequest: pullRequestId,
    warnings,
    json: options.json,
  });
  return 0;
}

/**
 * Drains the accumulated warnings and emits the empty-findings envelope used
 * by the two short-circuit paths in `runMain` (no resolvable branch axis,
 * skip-API file-set decision). Returns the exit code so callers can
 * `return emitEmptyShortCircuit(...)`. Pulling the body out keeps `runMain`
 * under the cognitive-complexity gate.
 *
 * @param {{
 *   deps: { stdout: { write: (chunk: string) => unknown }, stderr: { write: (chunk: string) => unknown } },
 *   options: { includeHotspots: boolean, includeDuplications: boolean, json: boolean },
 *   warnings: readonly string[],
 *   projectKey: string,
 *   branchName: string | null,
 *   queryTimestamp: string,
 *   pullRequestId: number | null,
 * }} input
 * @returns {0}
 */
function emitEmptyShortCircuit(input) {
  for (const warning of input.warnings) {
    writeStderrLine(input.deps.stderr, warning);
  }
  emitResult({
    stdout: input.deps.stdout,
    findings: [],
    hotspots: [],
    duplications: [],
    projectKey: input.projectKey,
    branch: input.branchName,
    queryTimestamp: input.queryTimestamp,
    fromCache: false,
    cacheAgeSeconds: null,
    hotspotsIncluded: input.options.includeHotspots,
    duplicationsIncluded: input.options.includeDuplications,
    pullRequest: input.pullRequestId,
    warnings: input.warnings,
    json: input.options.json,
  });
  return 0;
}

/**
 * Parses the cached issues payload, emits the cached envelope with the
 * computed cache-age, and returns 0. Shared between the cache-fresh path and
 * the transient-failure stale-cache fallback in `runMain`; both paths
 * previously inlined the same parse-and-emit block.
 *
 * @param {{
 *   deps: { stdout: { write: (chunk: string) => unknown }, stderr: { write: (chunk: string) => unknown } },
 *   cachedEntry: { fetchedAt: number, payload: unknown },
 *   now: number,
 *   projectKey: string,
 *   warnings: string[],
 *   options: { includeHotspots: boolean, includeDuplications: boolean, json: boolean },
 *   hotspots: ReadonlyArray<unknown>,
 *   duplications: ReadonlyArray<unknown>,
 *   branchName: string | null,
 *   queryTimestamp: string,
 *   pullRequestId: number | null,
 * }} input
 * @returns {0}
 */
function emitIssuesFromCache(input) {
  const ageSeconds = Math.floor((input.now - input.cachedEntry.fetchedAt) / 1000);
  const findings =
    safeParsePayload(
      parseIssuesResponse,
      input.cachedEntry.payload,
      { projectKey: input.projectKey },
      'issues',
      'cache',
      input.deps.stderr,
      input.warnings,
    ) ?? [];
  emitResult({
    stdout: input.deps.stdout,
    findings,
    hotspots: input.hotspots,
    duplications: input.duplications,
    projectKey: input.projectKey,
    branch: input.branchName,
    queryTimestamp: input.queryTimestamp,
    fromCache: true,
    cacheAgeSeconds: ageSeconds,
    hotspotsIncluded: input.options.includeHotspots,
    duplicationsIncluded: input.options.includeDuplications,
    pullRequest: input.pullRequestId,
    warnings: input.warnings,
    json: input.options.json,
  });
  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const productionDeps = {
  fetch: globalThis.fetch.bind(globalThis),
  fs: { readFile, writeFile, mkdir },
  runGit: realRunGit,
  readConnectedMode: () => realReadConnectedMode({ readFile }),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  now: () => Date.now(),
};

const invokedAsCli =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedAsCli) {
  // Setting `process.exitCode` (rather than calling `process.exit()`) lets
  // the event loop drain undici's keep-alive sockets cleanly. On Windows
  // 24.x, calling `process.exit()` while sockets are still tearing down
  // has been observed to trigger a libuv UV_HANDLE_CLOSING assertion. The
  // script otherwise has no long-running handles, so this exits as fast as
  // `exit()`. Reproducer for a future maintainer: when libuv ships a fix
  // this guard becomes redundant — replace `process.exitCode = ...` with
  // `process.exit(...)` and run `pnpm test:run` on Windows-Node 24.x; if
  // no UV_HANDLE_CLOSING assertion fires, the guard can be removed.
  try {
    process.exitCode = await runMain(productionDeps, process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to run sonar-findings query: ${message}\n`);
    process.exitCode = 1;
  }
}
