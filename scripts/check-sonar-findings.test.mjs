import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runMain } from './check-sonar-findings.mjs';
import hotspotsResponseFixture from './sonar-findings/fixtures/hotspots-response.json' with {
  type: 'json',
};
import issuesResponseFixture from './sonar-findings/fixtures/issues-response.json' with {
  type: 'json',
};

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
//     (added in subsequent commit)
//   - S5b fresh-cache strict-throw exit-0 contract — schema-drifted fresh
//     cached payload short-circuits to exit 0 with a warning, no fetch.
//     (added in subsequent commit)
//   - S4 end-to-end --include-hotspots wiring — both endpoints requested
//     with the right URL shape, both arrays present in the JSON envelope.
//     (added in subsequent commit)
//   - S5a/c/d edge-case branches — skipApi, --no-cache, auth-missing.
//     (added in subsequent commit)
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
