import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runMain } from './check-sonar-findings.mjs';
import hotspotsResponseFixture from './sonar-findings/fixtures/hotspots-response.json' with {
  type: 'json',
};
import issuesResponseFixture from './sonar-findings/fixtures/issues-response.json' with {
  type: 'json',
};
import { DEFAULT_HOTSPOTS_PAGE_SIZE } from './sonar-findings/hotspots.mjs';
import { DEFAULT_ISSUES_PAGE_SIZE, DEFAULT_STATUSES } from './sonar-findings/issues.mjs';
import { CACHE_SCHEMA_VERSION, cacheKeyOf } from './sonar-findings/query.mjs';

// ---------------------------------------------------------------------------
// Coverage map
//
// This file exercises the runner's I/O wiring through the exported
// `runMain(deps, argv)` seam. Every test substitutes the `deps` bag with
// in-memory equivalents so no real network call, no real subprocess, and no
// real filesystem touch happens during the run.
//
// Specs (lined up with ADR-0042 § Layout):
//   - S2 cache-clobber regression — `--include-hotspots` against an empty
//     cache writes both an `issues::...` and a `hotspots::...` entry.
//   - S3 stale-cache strict-throw exit-0 contract — schema-drifted cached
//     payload + transient HTTP-503 collapses to exit 0 with a warning.
//   - S5b fresh-cache strict-throw exit-0 contract — schema-drifted fresh
//     cached payload short-circuits to exit 0 with a warning, no fetch.
//   - S4 end-to-end --include-hotspots wiring — both endpoints requested
//     with the right URL shape, both arrays present in the JSON envelope.
//   - S5a/c/d edge-case branches — skipApi, --no-cache, auth-missing.
//
// Deliberately not covered here:
//   - `parseArgs` direct coverage. Pure function; transitively exercised by
//     every flag combination in the harness.
//   - `--all` mode dedicated test. `--all` sets `files = []`, which threads
//     through the URL builders and `cacheKeyOf` in their existing
//     `query.test.mjs` coverage. No runner-side branch unique to `--all`.
//   - `--files` explicit-list dedicated test. Same logic; transitively
//     covered by the harness's tests that pass an explicit file list.
// ---------------------------------------------------------------------------

const TEST_PROJECT_KEY = 'team4procoaching_website';
const CACHE_FILE_PATH = join('.sonar-cache', 'cache.json');

/**
 * Builds a minimal-viable in-memory `fs` substitute backed by a `Map<string,
 * string>`. `readFile` rejects ENOENT-style for missing keys (the runner's
 * `readCache` branches on `error.code === 'ENOENT'`), `writeFile` records the
 * write, and `mkdir` is a no-op. `connectedMode.json` is pre-seeded so the
 * runner's connected-mode load returns the test project key.
 */
function createInMemoryFs() {
  const files = new Map();
  files.set(
    '.sonarlint/connectedMode.json',
    JSON.stringify({
      sonarCloudOrganization: 'team4procoaching',
      projectKey: TEST_PROJECT_KEY,
    }),
  );
  return {
    files,
    readFile: vi.fn(async (path) => {
      if (!files.has(path)) {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
        err.code = 'ENOENT';
        throw err;
      }
      return files.get(path);
    }),
    writeFile: vi.fn(async (path, data) => {
      files.set(path, data);
    }),
    mkdir: vi.fn(async () => undefined),
  };
}

/**
 * Builds the minimal-viable deps bag every test starts from. Tests pass an
 * `overrides` object to layer scenario-specific behaviour (e.g. a `fetch`
 * stub returning canned responses, a `runGit` stub returning a synthetic
 * diff, a pre-populated `fs.files` map). The defaults are pessimistic —
 * `fetch` throws "unmocked" so a test that forgets to wire a fetch stub
 * fails loudly — and the `now()` is fixed at `1_000_000` so cache-age math
 * is deterministic.
 */
function createTestDeps(overrides = {}) {
  const fs = overrides.fs ?? createInMemoryFs();
  const stdoutChunks = [];
  const stderrChunks = [];
  const deps = {
    fetch:
      overrides.fetch ??
      vi.fn(async () => {
        throw new Error('fetch called without a test-supplied stub');
      }),
    fs,
    runGit: overrides.runGit ?? vi.fn(() => ({ exitCode: 0, stdout: '', stderr: '' })),
    readConnectedMode:
      overrides.readConnectedMode ??
      (async () => ({
        organization: 'team4procoaching',
        projectKey: TEST_PROJECT_KEY,
      })),
    env: overrides.env ?? { SONAR_TOKEN: 'test-token', PATH: '/usr/bin' },
    stdout: { write: (chunk) => stdoutChunks.push(String(chunk)) },
    stderr: { write: (chunk) => stderrChunks.push(String(chunk)) },
    now: overrides.now ?? (() => 1_000_000),
  };
  return { deps, fs, stdoutChunks, stderrChunks };
}

/**
 * Builds a minimal `Response`-shaped object for the deps `fetch` mock. The
 * runner reads `.ok`, `.status`, `.headers.get('retry-after')` and
 * `.json()` — nothing else. `headers.get` returns `null` for absent keys,
 * matching the real Headers semantics.
 */
function makeOkResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => payload,
  };
}

/**
 * Routes a fetch URL to the matching fixture payload. Both endpoints share
 * the `/api/<name>/search` URL shape so a substring match is unambiguous.
 */
function fixturePayloadFor(url) {
  if (url.includes('/api/issues/search')) return issuesResponseFixture;
  if (url.includes('/api/hotspots/search')) return hotspotsResponseFixture;
  throw new Error(`fixturePayloadFor: no fixture mapped for URL ${url}`);
}

/**
 * Builds a minimal `Response` for an HTTP-error path. The runner reads
 * `.ok` and `.status` only on the failure branch; `.headers.get('retry-after')`
 * is read for HTTP 429 and benign elsewhere.
 */
function makeHttpErrorResponse(status) {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: async () => ({}),
  };
}

/**
 * Writes a wrapped cache envelope into the in-memory `fs` so the runner's
 * `readCache` returns the supplied entries map. Mirrors the on-disk shape
 * `{ schemaVersion, entries }` so the cache is loaded as-is.
 */
function primeCache(fs, entries) {
  const wrapped = { schemaVersion: CACHE_SCHEMA_VERSION, entries };
  fs.files.set(CACHE_FILE_PATH, JSON.stringify(wrapped));
}

const ISSUES_CACHE_KEY = cacheKeyOf({
  endpoint: 'issues',
  files: [],
  statuses: DEFAULT_STATUSES,
  pageSize: DEFAULT_ISSUES_PAGE_SIZE,
});

const HOTSPOTS_CACHE_KEY = cacheKeyOf({
  endpoint: 'hotspots',
  files: [],
  pageSize: DEFAULT_HOTSPOTS_PAGE_SIZE,
});

// ---------------------------------------------------------------------------
// S2 cache-clobber regression
// ---------------------------------------------------------------------------

describe('runMain — S2 cache-clobber regression', () => {
  it('persists both an issues and a hotspots entry when --include-hotspots is set against an empty cache', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, fs } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const cacheText = fs.files.get(CACHE_FILE_PATH);
    expect(cacheText).toBeDefined();
    const cache = JSON.parse(cacheText);
    const cacheKeys = Object.keys(cache.entries);
    expect(cacheKeys.some((key) => key.startsWith('issues::'))).toBe(true);
    expect(cacheKeys.some((key) => key.startsWith('hotspots::'))).toBe(true);
  });

  it('emits a JSON envelope with both findings and hotspots arrays on the same scenario', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, stdoutChunks } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    const stdoutText = stdoutChunks.join('');
    const envelope = JSON.parse(stdoutText);
    expect(Array.isArray(envelope.findings)).toBe(true);
    expect(Array.isArray(envelope.hotspots)).toBe(true);
    expect(envelope.findings.length).toBeGreaterThan(0);
    expect(envelope.hotspots.length).toBeGreaterThan(0);
    expect(envelope.meta.snapshotInfo.hotspotsIncluded).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S3 stale-cache strict-throw exit-0 contract
//
// The runner's transient-failure path falls back to the on-disk cache when
// SonarCloud is unreachable. If that cached payload no longer satisfies the
// strict response parser (a future schema change drifted the cache shape
// out from under us), the parser throws on the cached payload. ADR-0042
// mandates exit 0 on every transient-failure path; the parser-throw escape
// today violates that contract by promoting the runtime error to exit 1.
// These two tests assert the contract per endpoint and fail today; the
// follow-up runner-side fix wraps the parse in try/catch and returns 0
// with a warning instead.
// ---------------------------------------------------------------------------

describe('runMain — S3 stale-cache strict-throw exit-0 contract', () => {
  it('returns exit 0 when the issues stale-cache payload no longer matches the parser shape', async () => {
    const fs = createInMemoryFs();
    primeCache(fs, {
      [ISSUES_CACHE_KEY]: { fetchedAt: 0, payload: { issues: 'not-an-array' } },
    });
    const fetchMock = vi.fn(async () => makeHttpErrorResponse(503));
    const { deps, stderrChunks } = createTestDeps({ fs, fetch: fetchMock });

    const exit = await runMain(deps, ['--json', '--all']);

    expect(exit).toBe(0);
    const stderrText = stderrChunks.join('');
    expect(stderrText).toContain('cache payload shape invalid');
  });

  it('returns exit 0 when the hotspots stale-cache payload no longer matches the parser shape', async () => {
    const fs = createInMemoryFs();
    primeCache(fs, {
      [HOTSPOTS_CACHE_KEY]: { fetchedAt: 0, payload: {} },
    });
    const fetchMock = vi.fn(async () => makeHttpErrorResponse(503));
    const { deps, stderrChunks } = createTestDeps({ fs, fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    const stderrText = stderrChunks.join('');
    expect(stderrText).toContain('cache payload shape invalid');
  });
});

// ---------------------------------------------------------------------------
// S5b fresh-cache strict-throw exit-0 contract
//
// Symmetric to S3 but for the cached-fresh branch: a payload that is still
// within the TTL but no longer satisfies the strict parser short-circuits
// the fetch, falls into the parse, and throws. The exit-0 contract applies
// here too — ADR-0042 makes no distinction between stale-cache and
// fresh-cache fallbacks. These two tests fail today and turn green when
// the fix wraps both fresh-cache call sites in try/catch.
// ---------------------------------------------------------------------------

describe('runMain — S5b fresh-cache strict-throw exit-0 contract', () => {
  it('returns exit 0 when the issues fresh-cache payload no longer matches the parser shape', async () => {
    const fs = createInMemoryFs();
    primeCache(fs, {
      [ISSUES_CACHE_KEY]: { fetchedAt: 999_000, payload: { issues: 'not-an-array' } },
    });
    const fetchMock = vi.fn(async () => {
      throw new Error('fresh-cache path must short-circuit before fetch');
    });
    const { deps, stderrChunks } = createTestDeps({ fs, fetch: fetchMock });

    const exit = await runMain(deps, ['--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    const stderrText = stderrChunks.join('');
    expect(stderrText).toContain('cache payload shape invalid');
  });

  it('returns exit 0 when the hotspots fresh-cache payload no longer matches the parser shape', async () => {
    const fs = createInMemoryFs();
    // Prime the issues cache with a well-formed payload too so the issues
    // path also short-circuits — the assertion targets the hotspots
    // fresh-cache parse-throw in isolation, not the issues network path.
    primeCache(fs, {
      [ISSUES_CACHE_KEY]: { fetchedAt: 999_000, payload: issuesResponseFixture },
      [HOTSPOTS_CACHE_KEY]: { fetchedAt: 999_000, payload: {} },
    });
    const fetchMock = vi.fn(async () => {
      throw new Error('fresh-cache path must short-circuit before fetch');
    });
    const { deps, stderrChunks } = createTestDeps({ fs, fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    const stderrText = stderrChunks.join('');
    expect(stderrText).toContain('cache payload shape invalid');
  });
});

// ---------------------------------------------------------------------------
// S4 end-to-end --include-hotspots wiring
//
// Exercises the full pipeline against a fresh in-memory cache: argv parsing,
// URL builder selection per endpoint (issues uses `componentKeys=`, hotspots
// uses `projectKey=`+`files=` per ADR-0042 § Endpoint asymmetry), fetch
// dispatch, fixture parse, cache write, and output formatter routing for
// both JSON and pretty modes. A failure here narrows future regressions to
// "the e2e wiring broke" rather than "is it the harness or the runner?".
// ---------------------------------------------------------------------------

describe('runMain — S4 end-to-end --include-hotspots wiring', () => {
  it('requests both endpoints with the right URL parameter shape', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestedUrls = fetchMock.mock.calls.map((call) => call[0]);
    const issuesUrl = requestedUrls.find((url) => url.includes('/api/issues/search'));
    const hotspotsUrl = requestedUrls.find((url) => url.includes('/api/hotspots/search'));
    expect(issuesUrl).toBeDefined();
    expect(hotspotsUrl).toBeDefined();
    expect(issuesUrl).toContain(`componentKeys=${TEST_PROJECT_KEY}`);
    expect(hotspotsUrl).toContain(`projectKey=${TEST_PROJECT_KEY}`);
    expect(hotspotsUrl).not.toContain('componentKeys=');
  });

  it('emits both findings and hotspots arrays plus the hotspotsIncluded snapshot flag in JSON mode', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, stdoutChunks } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--json', '--all']);

    expect(exit).toBe(0);
    const envelope = JSON.parse(stdoutChunks.join(''));
    expect(envelope.findings.length).toBeGreaterThan(0);
    expect(envelope.hotspots.length).toBeGreaterThan(0);
    expect(envelope.meta.snapshotInfo.hotspotsIncluded).toBe(true);
  });

  it('renders a Security Hotspots section in pretty mode', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, stdoutChunks } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--include-hotspots', '--all']);

    expect(exit).toBe(0);
    expect(stdoutChunks.join('')).toContain('Security Hotspots:');
  });

  it('omits the hotspots fetch and the hotspots section when --include-hotspots is absent', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, stdoutChunks } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/issues/search');
    const envelope = JSON.parse(stdoutChunks.join(''));
    expect(envelope.hotspots).toBeUndefined();
    expect(envelope.meta.snapshotInfo.hotspotsIncluded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S5a — skipApi edge-case path
//
// When `classifyDiffEdgeCase` returns a non-`ok` tag (e.g. the operator is
// already on `main`, where `git diff main...HEAD` is empty by definition),
// the runner short-circuits the API call and emits an empty result with the
// classifier's warning. This test triggers the `on-main` tag by stubbing
// `runGit` so `currentBranch` resolves to `main` and `refExists` confirms
// the local `main` ref.
// ---------------------------------------------------------------------------

describe('runMain — S5a skipApi edge-case path', () => {
  it('skips fetch and emits the on-main warning when the current branch is main', async () => {
    const runGitMock = vi.fn((args) => {
      if (args[0] === 'symbolic-ref') {
        return { exitCode: 0, stdout: 'main\n', stderr: '' };
      }
      if (args[0] === 'rev-parse') {
        return { exitCode: 0, stdout: 'deadbeef\n', stderr: '' };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    });
    const fetchMock = vi.fn(async () => {
      throw new Error('fetch must not be called on the on-main short-circuit');
    });
    const { deps, stderrChunks } = createTestDeps({
      runGit: runGitMock,
      fetch: fetchMock,
    });

    const exit = await runMain(deps, ['--json']);

    expect(exit).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stderrChunks.join('')).toContain('current branch is main');
  });
});

// ---------------------------------------------------------------------------
// S5c — --no-cache short-circuit
//
// `--no-cache` bypasses the cache read but still persists fresh fetches,
// matching the existing semantics. The test asserts `fs.readFile` is called
// only for `connectedMode.json` (never for the cache file) and that the
// fetch fires exactly once.
// ---------------------------------------------------------------------------

describe('runMain — S5c --no-cache short-circuit', () => {
  it('does not read the cache file but still fetches and persists the fresh response', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, fs } = createTestDeps({ fetch: fetchMock });

    const exit = await runMain(deps, ['--no-cache', '--json', '--all']);

    expect(exit).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const readPaths = fs.readFile.mock.calls.map((call) => call[0]);
    expect(readPaths).not.toContain(CACHE_FILE_PATH);
    expect(fs.files.get(CACHE_FILE_PATH)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// S5d — auth-missing warning emission
//
// When `SONAR_TOKEN` is unset, the runner appends an `auth-missing` warning
// to `meta.warnings` and surfaces the classifier's stderr line. The test
// supplies a successful `fetch` mock so the runner stays on the
// successful-fetch path; without that, the runner drops into the
// transient-failure branch and the `meta.warnings` ordering shifts away
// from what this assertion targets.
// ---------------------------------------------------------------------------

describe('runMain — S5d auth-missing warning emission', () => {
  it('warns about the missing SONAR_TOKEN both on stderr and in meta.warnings', async () => {
    const fetchMock = vi.fn(async (url) => makeOkResponse(fixturePayloadFor(url)));
    const { deps, stdoutChunks, stderrChunks } = createTestDeps({
      fetch: fetchMock,
      env: { PATH: '/usr/bin' },
    });

    const exit = await runMain(deps, ['--json', '--all']);

    expect(exit).toBe(0);
    expect(stderrChunks.join('')).toContain('SONAR_TOKEN not set');
    const envelope = JSON.parse(stdoutChunks.join(''));
    expect(envelope.meta.warnings).toContain('unauthenticated query (no SONAR_TOKEN)');
  });
});
