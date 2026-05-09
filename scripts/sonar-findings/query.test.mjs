import { describe, expect, it } from 'vitest';

import issuesResponseFixture from './fixtures/issues-response.json' with { type: 'json' };
import { parseIssuesResponse } from './issues.mjs';
import {
  buildMeta,
  CACHE_SCHEMA_VERSION,
  cacheKeyOf,
  classifyDiffEdgeCase,
  classifyError,
  compareFindings,
  DEFAULT_CACHE_TTL_MS,
  formatJson,
  formatPretty,
  isCacheFresh,
  parseCacheEntry,
  parseConnectedMode,
  SCHEMA_VERSION,
} from './query.mjs';

const FIXTURE_PROJECT_KEY = 'team4procoaching_website';

// ---------------------------------------------------------------------------
// parseConnectedMode
// ---------------------------------------------------------------------------

describe('parseConnectedMode', () => {
  it('extracts organization and projectKey from a well-shaped object', () => {
    const result = parseConnectedMode({
      sonarCloudOrganization: 'team4procoaching',
      projectKey: 'team4procoaching_website',
    });
    expect(result).toEqual({
      organization: 'team4procoaching',
      projectKey: 'team4procoaching_website',
    });
  });

  it('throws when the payload is null', () => {
    expect(() => parseConnectedMode(null)).toThrow(/not an object/);
  });

  it('throws when sonarCloudOrganization is missing', () => {
    expect(() => parseConnectedMode({ projectKey: 'x' })).toThrow(/sonarCloudOrganization/);
  });

  it('throws when projectKey is missing', () => {
    expect(() => parseConnectedMode({ sonarCloudOrganization: 'org' })).toThrow(/projectKey/);
  });

  it('throws when sonarCloudOrganization is empty', () => {
    expect(() => parseConnectedMode({ sonarCloudOrganization: '', projectKey: 'x' })).toThrow(
      /sonarCloudOrganization/,
    );
  });
});

// ---------------------------------------------------------------------------
// compareFindings
// ---------------------------------------------------------------------------

describe('compareFindings', () => {
  it('orders by file primarily', () => {
    const a = { file: 'a.ts', line: 99, rule: 'z' };
    const b = { file: 'b.ts', line: 1, rule: 'a' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('orders by line when files match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'z' };
    const b = { file: 'a.ts', line: 10, rule: 'a' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('orders by rule when file and line match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'aaa' };
    const b = { file: 'a.ts', line: 5, rule: 'bbb' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('returns zero when all three keys match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'r' };
    const b = { file: 'a.ts', line: 5, rule: 'r' };
    expect(compareFindings(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatPretty / formatJson
// ---------------------------------------------------------------------------

const sampleMeta = buildMeta({
  projectKey: 'p',
  branch: 'feature/x',
  queryTimestamp: '2026-05-01T00:01:00Z',
  fromCache: false,
  cacheAgeSeconds: null,
  hotspotsIncluded: false,
  warnings: [],
});

describe('formatPretty', () => {
  it('does not throw on an empty findings array', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('(no findings)');
  });

  it('renders a banner naming the project and branch', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('project p');
    expect(output).toContain('branch feature/x');
  });

  it('omits any analysis-timestamp claim from the banner', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).not.toContain('as of last analysis');
    expect(output).not.toContain('unknown');
  });

  it('renders one block per finding with rule, severity, and location', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    const output = formatPretty(findings, sampleMeta);
    expect(output).toContain('typescript:S7761');
    expect(output).toContain('[MAJOR]');
    expect(output).toContain('src/components/ui/section.test.ts:107');
  });

  it('prefixes warnings with an exclamation mark', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      warnings: ['hello world'],
    });
    const output = formatPretty([], meta);
    expect(output).toContain('! hello world');
  });

  it('annotates the banner when results come from cache', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      fromCache: true,
      cacheAgeSeconds: 42,
      warnings: [],
    });
    const output = formatPretty([], meta);
    expect(output).toContain('cached, 42s old');
  });

  it('renders the PR axis label when meta.snapshotInfo.pullRequest is set', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      pullRequest: 42,
      warnings: [],
    });
    const output = formatPretty([], meta);
    expect(output).toContain('on pull request #42');
    expect(output).not.toContain('on branch feature/x');
  });

  describe('hotspots branch', () => {
    const hotspotsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      hotspotsIncluded: true,
      warnings: [],
    });
    const sampleHotspots = [
      {
        rule: 'javascript:S5852',
        file: 'scripts/generate-csp-hashes.mjs',
        line: 93,
        message: 'regex',
        vulnerabilityProbability: 'MEDIUM',
        status: 'TO_REVIEW',
      },
    ];

    it('renders the Security Hotspots header when hotspotsIncluded is true', () => {
      const output = formatPretty([], hotspotsMeta, sampleHotspots);
      expect(output).toContain('Security Hotspots:');
    });

    it('renders the (no hotspots) line on an empty hotspots array', () => {
      const output = formatPretty([], hotspotsMeta, []);
      expect(output).toContain('Security Hotspots:');
      expect(output).toContain('(no hotspots)');
    });

    it('renders each hotspot block with rule, probability, location, and message', () => {
      const output = formatPretty([], hotspotsMeta, sampleHotspots);
      expect(output).toContain('  javascript:S5852  [MEDIUM]  scripts/generate-csp-hashes.mjs:93');
      expect(output).toContain('    regex');
    });

    it('does not render the hotspots section when hotspotsIncluded is false', () => {
      const output = formatPretty([], sampleMeta, sampleHotspots);
      expect(output).not.toContain('Security Hotspots:');
      expect(output).not.toContain('(no hotspots)');
    });
  });

  describe('duplications branch', () => {
    const duplicationsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      duplicationsIncluded: true,
      warnings: [],
    });
    const sampleDuplications = [
      {
        rule: 'sonarcloud:duplicated-block',
        file: 'src/scripts/quizModalController.test.ts',
        line: 332,
        size: 23,
        message: 'duplicated block (also at line 358, line 387, line 418)',
      },
    ];

    it('renders the Duplicated Blocks header when duplicationsIncluded is true', () => {
      const output = formatPretty([], duplicationsMeta, [], sampleDuplications);
      expect(output).toContain('Duplicated Blocks:');
    });

    it('renders the (no duplications) line on an empty duplications array', () => {
      const output = formatPretty([], duplicationsMeta, [], []);
      expect(output).toContain('Duplicated Blocks:');
      expect(output).toContain('(no duplications)');
    });

    it('renders each duplication block with rule, size, location, and partner message', () => {
      const output = formatPretty([], duplicationsMeta, [], sampleDuplications);
      expect(output).toContain(
        '  sonarcloud:duplicated-block  [23 lines]  src/scripts/quizModalController.test.ts:332',
      );
      expect(output).toContain('    duplicated block (also at line 358');
    });

    it('does not render the duplications section when duplicationsIncluded is false', () => {
      const output = formatPretty([], sampleMeta, [], sampleDuplications);
      expect(output).not.toContain('Duplicated Blocks:');
      expect(output).not.toContain('(no duplications)');
    });

    it('stacks duplications below hotspots when both flags are set', () => {
      const stackedMeta = buildMeta({
        ...sampleMeta.snapshotInfo,
        hotspotsIncluded: true,
        duplicationsIncluded: true,
        warnings: [],
      });
      const sampleHotspots = [
        {
          rule: 'javascript:S5852',
          file: 'scripts/generate-csp-hashes.mjs',
          line: 93,
          message: 'regex',
          vulnerabilityProbability: 'MEDIUM',
          status: 'TO_REVIEW',
        },
      ];
      const output = formatPretty([], stackedMeta, sampleHotspots, sampleDuplications);
      const hotspotsAt = output.indexOf('Security Hotspots:');
      const duplicationsAt = output.indexOf('Duplicated Blocks:');
      expect(hotspotsAt).toBeGreaterThan(-1);
      expect(duplicationsAt).toBeGreaterThan(hotspotsAt);
    });
  });
});

describe('formatJson', () => {
  it('emits the stable envelope with meta and findings keys', () => {
    const json = formatJson([], sampleMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual(['findings', 'meta']);
    expect(parsed.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.findings).toEqual([]);
  });

  it('emits an identical top-level shape on transient-error paths', () => {
    const errorMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      warnings: ['network error reaching sonarcloud.io: ECONNRESET'],
    });
    const json = formatJson([], errorMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual(['findings', 'meta']);
    expect(parsed.meta.warnings).toContain('network error reaching sonarcloud.io: ECONNRESET');
  });

  it('preserves all required finding fields', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    const json = formatJson(findings, sampleMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed.findings[0]).sort((a, b) => a.localeCompare(b))).toEqual([
      'file',
      'line',
      'message',
      'rule',
      'severity',
      'status',
    ]);
  });

  it('omits the analysis-timestamp field from snapshotInfo', () => {
    const json = formatJson([], sampleMeta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.snapshotInfo).not.toHaveProperty('analysisTimestamp');
  });

  it('emits meta.snapshotInfo.pullRequest as null on the branch axis', () => {
    const json = formatJson([], sampleMeta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.snapshotInfo.pullRequest).toBeNull();
  });

  it('emits meta.snapshotInfo.pullRequest as a number under the PR axis', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      pullRequest: 42,
      warnings: [],
    });
    const json = formatJson([], meta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.snapshotInfo.pullRequest).toBe(42);
  });

  it('keeps meta.snapshotInfo.branch as a non-empty string under the PR axis (additivity contract)', () => {
    // ADR-0046 § Decision → JSON envelope additivity: under
    // `--pull-request=<n>`, `branch` keeps its non-nullable string type
    // and continues to hold the resolved current local branch name. The
    // PR id surfaces only on the new sibling `pullRequest` field.
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      branch: 'feature/x',
      pullRequest: 42,
      warnings: [],
    });
    const json = formatJson([], meta);
    const parsed = JSON.parse(json);
    expect(typeof parsed.meta.snapshotInfo.branch).toBe('string');
    expect(parsed.meta.snapshotInfo.branch.length).toBeGreaterThan(0);
    expect(parsed.meta.snapshotInfo.branch).toBe('feature/x');
    expect(parsed.meta.snapshotInfo.pullRequest).toBe(42);
  });

  describe('hotspots branch', () => {
    const hotspotsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      hotspotsIncluded: true,
      warnings: [],
    });
    const sampleHotspots = [
      {
        rule: 'javascript:S5852',
        file: 'scripts/generate-csp-hashes.mjs',
        line: 93,
        message: 'regex',
        vulnerabilityProbability: 'MEDIUM',
        status: 'TO_REVIEW',
      },
    ];

    it('adds the top-level hotspots array when hotspotsIncluded is true', () => {
      const json = formatJson([], hotspotsMeta, sampleHotspots);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual([
        'findings',
        'hotspots',
        'meta',
      ]);
      expect(parsed.hotspots).toHaveLength(1);
      expect(parsed.hotspots[0].vulnerabilityProbability).toBe('MEDIUM');
    });

    it('omits the top-level hotspots key when hotspotsIncluded is false', () => {
      const json = formatJson([], sampleMeta, sampleHotspots);
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('hotspots');
    });

    it('reflects hotspotsIncluded on meta.snapshotInfo', () => {
      const json = formatJson([], hotspotsMeta, []);
      const parsed = JSON.parse(json);
      expect(parsed.meta.snapshotInfo.hotspotsIncluded).toBe(true);
      // duplicationsIncluded defaults to `false` so consumers can read
      // the flag without checking for `undefined`.
      expect(parsed.meta.snapshotInfo.duplicationsIncluded).toBe(false);
    });
  });

  describe('duplications branch', () => {
    const duplicationsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      duplicationsIncluded: true,
      warnings: [],
    });
    const sampleDuplications = [
      {
        rule: 'sonarcloud:duplicated-block',
        file: 'src/scripts/quizModalController.test.ts',
        line: 332,
        size: 23,
        message: 'duplicated block (also at line 358)',
      },
    ];

    it('adds the top-level duplications array when duplicationsIncluded is true', () => {
      const json = formatJson([], duplicationsMeta, [], sampleDuplications);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual([
        'duplications',
        'findings',
        'meta',
      ]);
      expect(parsed.duplications).toHaveLength(1);
      expect(parsed.duplications[0].size).toBe(23);
      expect(parsed.duplications[0].rule).toBe('sonarcloud:duplicated-block');
    });

    it('omits the top-level duplications key when duplicationsIncluded is false', () => {
      const json = formatJson([], sampleMeta, [], sampleDuplications);
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('duplications');
    });

    it('reflects duplicationsIncluded on meta.snapshotInfo', () => {
      const json = formatJson([], duplicationsMeta, [], []);
      const parsed = JSON.parse(json);
      expect(parsed.meta.snapshotInfo.duplicationsIncluded).toBe(true);
    });

    it('preserves the documented five-field shape per duplication entry', () => {
      const json = formatJson([], duplicationsMeta, [], sampleDuplications);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed.duplications[0]).sort((a, b) => a.localeCompare(b))).toEqual([
        'file',
        'line',
        'message',
        'rule',
        'size',
      ]);
    });

    it('emits both top-level hotspots and duplications arrays when both flags are set', () => {
      const stackedMeta = buildMeta({
        ...sampleMeta.snapshotInfo,
        hotspotsIncluded: true,
        duplicationsIncluded: true,
        warnings: [],
      });
      const sampleHotspots = [
        {
          rule: 'javascript:S5852',
          file: 'scripts/generate-csp-hashes.mjs',
          line: 93,
          message: 'regex',
          vulnerabilityProbability: 'MEDIUM',
          status: 'TO_REVIEW',
        },
      ];
      const json = formatJson([], stackedMeta, sampleHotspots, sampleDuplications);
      const parsed = JSON.parse(json);
      expect(parsed.hotspots).toHaveLength(1);
      expect(parsed.duplications).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// cacheKeyOf / isCacheFresh / parseCacheEntry
// ---------------------------------------------------------------------------

const BRANCH_AXIS_FOO = { kind: 'branch', name: 'foo' };
const BRANCH_AXIS_MAIN = { kind: 'branch', name: 'main' };
const PR_AXIS_42 = { kind: 'pullRequest', id: '42' };

describe('cacheKeyOf', () => {
  it('produces the same key regardless of file order', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts', 'b.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['b.ts', 'a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    expect(a).toBe(b);
  });

  it('differentiates by statuses (issues endpoint)', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'CONFIRMED',
      pageSize: 10,
    });
    expect(a).not.toBe(b);
  });

  it('differentiates by pageSize', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 20,
    });
    expect(a).not.toBe(b);
  });

  it('differentiates by endpoint when files, statuses, and pageSize match', () => {
    const issues = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    const hotspots = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(issues).not.toBe(hotspots);
    expect(issues).toBe('issues::branch:foo::a.ts::OPEN::500');
    expect(hotspots).toBe('hotspots::branch:foo::a.ts::500');
  });

  it('omits the statuses segment from the hotspots key shape', () => {
    const hotspots = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      pageSize: 500,
    });
    // endpoint, branchAxis, files, pageSize — no statuses segment.
    expect(hotspots.split('::')).toHaveLength(4);
  });

  it('encodes the branch-axis prefix on the issues key', () => {
    const key = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    expect(key).toBe('issues::branch:foo::a.ts::OPEN::500');
  });

  it('encodes the pull-request axis prefix on the issues key', () => {
    const key = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: PR_AXIS_42,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    expect(key).toBe('issues::pullRequest:42::a.ts::OPEN::500');
  });

  it('encodes the branch-axis prefix on the hotspots key', () => {
    const key = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(key).toBe('hotspots::branch:foo::a.ts::500');
  });

  it('encodes the pull-request axis prefix on the hotspots key', () => {
    const key = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: PR_AXIS_42,
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(key).toBe('hotspots::pullRequest:42::a.ts::500');
  });

  it('produces the per-component duplications key shape', () => {
    const key = cacheKeyOf({
      endpoint: 'duplications',
      branchAxis: BRANCH_AXIS_FOO,
      componentKey: 'p:src/utils/slugify.ts',
    });
    expect(key).toBe('duplications::branch:foo::p:src/utils/slugify.ts');
  });

  it('encodes the pull-request axis prefix on the duplications key', () => {
    const key = cacheKeyOf({
      endpoint: 'duplications',
      branchAxis: PR_AXIS_42,
      componentKey: 'p:src/utils/slugify.ts',
    });
    expect(key).toBe('duplications::pullRequest:42::p:src/utils/slugify.ts');
  });

  it('produces distinct duplications keys per component', () => {
    const keyA = cacheKeyOf({
      endpoint: 'duplications',
      branchAxis: BRANCH_AXIS_FOO,
      componentKey: 'p:a.ts',
    });
    const keyB = cacheKeyOf({
      endpoint: 'duplications',
      branchAxis: BRANCH_AXIS_FOO,
      componentKey: 'p:b.ts',
    });
    expect(keyA).not.toBe(keyB);
  });

  it('produces the project-and-metrics measures-tree key shape', () => {
    const key = cacheKeyOf({
      endpoint: 'measures-tree',
      branchAxis: BRANCH_AXIS_FOO,
      projectKey: 'p',
      metricKeys: ['duplicated_lines'],
    });
    expect(key).toBe('measures-tree::branch:foo::p::duplicated_lines');
  });

  it('joins multiple metric keys into the measures-tree key', () => {
    const key = cacheKeyOf({
      endpoint: 'measures-tree',
      branchAxis: BRANCH_AXIS_FOO,
      projectKey: 'p',
      metricKeys: ['duplicated_lines', 'duplicated_blocks'],
    });
    expect(key).toBe('measures-tree::branch:foo::p::duplicated_lines,duplicated_blocks');
  });

  it('encodes the pull-request axis prefix on the measures-tree key', () => {
    const key = cacheKeyOf({
      endpoint: 'measures-tree',
      branchAxis: PR_AXIS_42,
      projectKey: 'p',
      metricKeys: ['duplicated_lines'],
    });
    expect(key).toBe('measures-tree::pullRequest:42::p::duplicated_lines');
  });

  it('discriminates duplications, measures-tree, issues, and hotspots even when other axes overlap', () => {
    const issues = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    const hotspots = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      pageSize: 500,
    });
    const duplications = cacheKeyOf({
      endpoint: 'duplications',
      branchAxis: BRANCH_AXIS_FOO,
      componentKey: 'p:a.ts',
    });
    const measuresTree = cacheKeyOf({
      endpoint: 'measures-tree',
      branchAxis: BRANCH_AXIS_FOO,
      projectKey: 'p',
      metricKeys: ['duplicated_lines'],
    });
    expect(new Set([issues, hotspots, duplications, measuresTree]).size).toBe(4);
  });

  it('produces three distinct keys for (issues, main), (issues, branch=foo), (issues, pullRequest=42)', () => {
    const main = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_MAIN,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    const foo = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    const pr = cacheKeyOf({
      endpoint: 'issues',
      branchAxis: PR_AXIS_42,
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    expect(new Set([main, foo, pr]).size).toBe(3);
  });

  it('produces three distinct keys for (hotspots, main), (hotspots, branch=foo), (hotspots, pullRequest=42)', () => {
    const main = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_MAIN,
      files: ['a.ts'],
      pageSize: 500,
    });
    const foo = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: BRANCH_AXIS_FOO,
      files: ['a.ts'],
      pageSize: 500,
    });
    const pr = cacheKeyOf({
      endpoint: 'hotspots',
      branchAxis: PR_AXIS_42,
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(new Set([main, foo, pr]).size).toBe(3);
  });
});

describe('isCacheFresh', () => {
  const now = 1_000_000;
  it('returns true when the entry is younger than the TTL', () => {
    expect(isCacheFresh({ fetchedAt: now - 1000 }, now, DEFAULT_CACHE_TTL_MS)).toBe(true);
  });

  it('returns false when the entry is older than the TTL', () => {
    expect(
      isCacheFresh({ fetchedAt: now - DEFAULT_CACHE_TTL_MS - 1 }, now, DEFAULT_CACHE_TTL_MS),
    ).toBe(false);
  });

  it('returns false for null or undefined entries', () => {
    expect(isCacheFresh(null, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh(undefined, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
  });

  it('returns false when fetchedAt is missing', () => {
    // @ts-expect-error - intentional shape violation for the defensive path
    expect(isCacheFresh({}, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
  });
});

describe('parseCacheEntry', () => {
  it('returns the entries map when schemaVersion matches CACHE_SCHEMA_VERSION', () => {
    const text = JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      entries: { k: { fetchedAt: 1, payload: {} } },
    });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entries.k).toEqual({ fetchedAt: 1, payload: {} });
    }
  });

  it('discards a cache whose schemaVersion does not match (bump-and-discard)', () => {
    const text = JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION + 1,
      entries: { k: { fetchedAt: 1, payload: {} } },
    });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('version-mismatch');
      if (result.reason === 'version-mismatch') {
        expect(result.actualVersion).toBe(CACHE_SCHEMA_VERSION + 1);
      }
    }
  });

  it('treats a pre-versioning cache (no schemaVersion field) as a discard', () => {
    const text = JSON.stringify({ k: { fetchedAt: 1, payload: {} } });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('version-missing');
    }
  });

  it('returns parse-error on malformed JSON', () => {
    const result = parseCacheEntry('not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('parse-error');
    }
  });

  it('returns shape on a JSON array (wrong root)', () => {
    const result = parseCacheEntry('[1,2,3]');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
  });

  it('returns shape on the string "null" (wrong root)', () => {
    const result = parseCacheEntry('null');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
  });

  it('returns shape when entries field is absent', () => {
    const text = JSON.stringify({ schemaVersion: CACHE_SCHEMA_VERSION });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
  });

  it('reports a v2 cache as version-mismatch under the v3 schema', () => {
    // The branch-axis extension (ADR-0046) bumped the cache schema 2→3.
    // A cache file written before the bump must read as a mismatch so the
    // bump-and-discard flow forces a fresh fetch instead of silently
    // surfacing entries under the wrong branch.
    const text = JSON.stringify({
      schemaVersion: 2,
      entries: { 'issues::a.ts::OPEN::500': { fetchedAt: 1, payload: {} } },
    });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('version-mismatch');
      if (result.reason === 'version-mismatch') {
        expect(result.actualVersion).toBe(2);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// classifyDiffEdgeCase
// ---------------------------------------------------------------------------

const baseGitContext = {
  branch: 'feature/x',
  isDetached: false,
  mainExists: true,
  masterExists: false,
  mergeBaseResolved: true,
  diffEntries: [],
};

describe('classifyDiffEdgeCase', () => {
  it('detects on-main when the working tree is on main', () => {
    const result = classifyDiffEdgeCase({ ...baseGitContext, branch: 'main' });
    expect(result.behaviourTag).toBe('on-main');
    expect(result.warnings[0]).toContain('current branch is main');
  });

  it('detects empty-diff on a non-main branch with no changes', () => {
    const result = classifyDiffEdgeCase(baseGitContext);
    expect(result.behaviourTag).toBe('empty-diff');
  });

  it('detects orphan when no merge-base resolves', () => {
    const result = classifyDiffEdgeCase({ ...baseGitContext, mergeBaseResolved: false });
    expect(result.behaviourTag).toBe('orphan');
  });

  it('detects detached-orphan when both detached and orphan', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      isDetached: true,
      mergeBaseResolved: false,
    });
    expect(result.behaviourTag).toBe('detached-orphan');
  });

  it('detects main-missing when neither main nor master exists', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      mainExists: false,
      masterExists: false,
    });
    expect(result.behaviourTag).toBe('main-missing');
  });

  it('strips submodule paths from the file set and warns', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'M',
          oldPath: null,
          newPath: 'sub/mod',
          similarityScore: null,
          isSubmodule: true,
        },
        {
          status: 'M',
          oldPath: null,
          newPath: 'src/a.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.behaviourTag).toBe('ok');
    expect(result.files).toEqual(['src/a.ts']);
    expect(result.warnings.some((w) => w.includes('submodule'))).toBe(true);
  });

  it('warns on partial renames and uses the new path', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'R',
          oldPath: 'src/old.ts',
          newPath: 'src/new.ts',
          similarityScore: 80,
          isSubmodule: false,
        },
      ],
    });
    expect(result.files).toEqual(['src/new.ts']);
    expect(result.warnings.some((w) => w.includes('renamed from'))).toBe(true);
  });

  it('drops deleted paths and warns', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'D',
          oldPath: null,
          newPath: 'src/gone.ts',
          similarityScore: null,
          isSubmodule: false,
        },
        {
          status: 'M',
          oldPath: null,
          newPath: 'src/here.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.files).toEqual(['src/here.ts']);
    expect(result.warnings.some((w) => w.includes('deleted'))).toBe(true);
  });

  it('returns ok when the diff produces a non-empty file list', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'A',
          oldPath: null,
          newPath: 'src/new.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.behaviourTag).toBe('ok');
    expect(result.files).toEqual(['src/new.ts']);
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe('classifyError', () => {
  it('routes 401 with token set to the regenerate-token message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 401,
      projectKey: 'p',
      tokenSet: true,
    });
    expect(result.stderr).toContain('Regenerate the token');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 401 without token to the set-SONAR_TOKEN message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 401,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('Set SONAR_TOKEN');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 403 to the scope-denied message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 403,
      projectKey: 'p',
      tokenSet: true,
    });
    expect(result.stderr).toContain('HTTP 403');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 404 to the project-not-found message and disallows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('HTTP 404');
    expect(result.allowStaleCache).toBe(false);
  });

  it('routes a 404 with branch-not-found body to the branch-not-analysed warning', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'p',
      tokenSet: false,
      responseBody: JSON.stringify({
        errors: [{ msg: "Component 'p:src/foo.ts' on branch 'feature/x' not found" }],
      }),
      branchAxis: { kind: 'branch', name: 'feature/x' },
    });
    expect(result.stderr).toContain("branch 'feature/x'");
    expect(result.stderr).toContain('not been analysed');
    expect(result.stderr).not.toContain('Check .sonarlint/connectedMode.json');
    expect(result.allowStaleCache).toBe(false);
  });

  it("routes a 404 with Project doesn't exist body to the same branch-not-analysed warning", () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'team4procoaching_website',
      tokenSet: false,
      responseBody: JSON.stringify({
        errors: [{ msg: "Project 'team4procoaching_website' doesn't exist" }],
      }),
      branchAxis: { kind: 'branch', name: 'feature/x' },
    });
    expect(result.stderr).toContain("branch 'feature/x'");
    expect(result.stderr).toContain('not been analysed');
    expect(result.allowStaleCache).toBe(false);
  });

  it("routes a pull-request 404 with Project doesn't exist body to the PR axis warning", () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'team4procoaching_website',
      tokenSet: false,
      responseBody: JSON.stringify({
        errors: [{ msg: "Project 'team4procoaching_website' doesn't exist" }],
      }),
      branchAxis: { kind: 'pullRequest', id: '999999' },
    });
    expect(result.stderr).toContain('pull request #999999');
    expect(result.stderr).toContain('not been analysed');
    expect(result.allowStaleCache).toBe(false);
  });

  // Hotspots return the same `Project '<key>' doesn't exist` body on a
  // pull-request axis that does not exist on SonarCloud, captured 2026-05-08
  // via a hotspots-PR probe (`branch-probe-hotspots-pr-bogus.json` under
  // `.claude/tmp/sonar-duplications-shape-probe/`). The branch-aware 404 row
  // routes hotspots-PR-not-found through the same warning as issues-PR-not-
  // found because the two endpoints share the body-pattern regex; no
  // hotspots-specific arm is required. ADR-0046 § Risk-mitigation trap-comment.
  it("routes a hotspots-context PR 404 with Project doesn't exist body to the same PR axis warning", () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'team4procoaching_website',
      tokenSet: false,
      // Verbatim body shape from the hotspots-PR-bogus capture.
      responseBody:
        '{ "errors": [{ "msg": "Project \'team4procoaching_website\' doesn\'t exist" }] }',
      branchAxis: { kind: 'pullRequest', id: '424242' },
    });
    expect(result.stderr).toContain('pull request #424242');
    expect(result.stderr).toContain('not been analysed');
    expect(result.stderr).not.toContain('Check .sonarlint/connectedMode.json');
    expect(result.allowStaleCache).toBe(false);
  });

  // The live SonarCloud API encodes apostrophes as the JSON-escape sequence
  // `'` on the wire — so `response.text()` returns a string containing
  // the literal characters `\`, `u`, `0`, `0`, `2`, `7`, not a U+0027
  // apostrophe. Verbatim hotspots-search 404 body captured from the live API
  // on a known-unanalysed branch. The matcher must JSON-parse the envelope
  // and apply the regex to the decoded `errors[].msg` so the wire-form
  // contract holds. ADR-0046 § Behaviour records the wire form.
  it("routes a 404 with the live JSON-escaped Project doesn't exist body to the branch-not-analysed warning", () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'team4procoaching_website',
      tokenSet: false,
      responseBody:
        '{"errors":[{"msg":"Project \\u0027team4procoaching_website\\u0027 doesn\\u0027t exist"}]}',
      branchAxis: { kind: 'branch', name: 'feat/sonar-duplications-metric' },
    });
    expect(result.stderr).toContain("branch 'feat/sonar-duplications-metric'");
    expect(result.stderr).toContain('not been analysed');
    expect(result.stderr).not.toContain('Check .sonarlint/connectedMode.json');
    expect(result.allowStaleCache).toBe(false);
  });

  it('falls back to the project-not-found arm when the 404 body does not match either pattern', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'p',
      tokenSet: false,
      responseBody: JSON.stringify({ errors: [{ msg: 'something else entirely' }] }),
      branchAxis: { kind: 'branch', name: 'feature/x' },
    });
    expect(result.stderr).toContain('Check .sonarlint/connectedMode.json');
    expect(result.stderr).not.toContain('not been analysed');
  });

  it('routes 429 to the rate-limit message and allows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 429,
      projectKey: 'p',
      tokenSet: false,
      retryAfter: '60',
    });
    expect(result.stderr).toContain('HTTP 429');
    expect(result.stderr).toContain('60');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 5xx to the server-error message and allows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 503,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('HTTP 503');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes network errors to a network-error message', () => {
    const result = classifyError({
      errorKind: 'network',
      httpStatus: null,
      projectKey: 'p',
      tokenSet: false,
      message: 'ENOTFOUND',
    });
    expect(result.stderr).toContain('ENOTFOUND');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes auth-missing to the unauthenticated-default message', () => {
    const result = classifyError({
      errorKind: 'auth-missing',
      httpStatus: null,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('SONAR_TOKEN not set');
    expect(result.allowStaleCache).toBe(false);
  });
});
