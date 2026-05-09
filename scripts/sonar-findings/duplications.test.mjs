import { describe, expect, it } from 'vitest';

import {
  buildDuplicationsShowUrl,
  buildMeasuresComponentTreeUrl,
  DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE,
  DUPLICATIONS_RULE_KEY,
  dedupeDuplicationFindings,
  MEASURES_COMPONENT_TREE_HARD_CAP_PAGES,
  mapDuplicationToFindings,
  parseDuplicationsShowResponse,
  parseMeasuresComponentTreeResponse,
} from './duplications.mjs';
import duplicationsShowFixture from './fixtures/duplications-show-response.json' with {
  type: 'json',
};
import measuresComponentTreeFixture from './fixtures/measures-component-tree-response.json' with {
  type: 'json',
};
import { SONARCLOUD_BASE_URL } from './query.mjs';

const FIXTURE_PROJECT_KEY = 'acme_org_project';
const FIXTURE_PERSPECTIVE_FILE = 'src/scripts/quizModalController.test.ts';
const FIXTURE_PERSPECTIVE_COMPONENT_KEY = `${FIXTURE_PROJECT_KEY}:${FIXTURE_PERSPECTIVE_FILE}`;

const BRANCH_AXIS_MAIN = { kind: 'branch', name: 'main' };
const BRANCH_AXIS_FEATURE = { kind: 'branch', name: 'feature/foo bar' };
const PR_AXIS_42 = { kind: 'pullRequest', id: '42' };

// ---------------------------------------------------------------------------
// buildDuplicationsShowUrl
// ---------------------------------------------------------------------------

describe('buildDuplicationsShowUrl', () => {
  it('builds the single-component URL with key=<projectKey>:<file>', () => {
    const url = buildDuplicationsShowUrl({
      projectKey: 'p',
      file: 'src/utils/slugify.ts',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toBe(
      `${SONARCLOUD_BASE_URL}/api/duplications/show?key=p%3Asrc%2Futils%2Fslugify.ts&branch=main`,
    );
    expect(url).not.toContain('files=');
    expect(url).not.toContain('componentKeys=');
  });

  it('emits &branch=<encoded> when the axis is a branch', () => {
    const url = buildDuplicationsShowUrl({
      projectKey: 'p',
      file: 'src/utils/slugify.ts',
      branchAxis: BRANCH_AXIS_FEATURE,
    });
    expect(url).toContain('branch=feature%2Ffoo+bar');
    expect(url).not.toContain('pullRequest=');
  });

  it('emits &pullRequest=<id> when the axis is a pull request', () => {
    const url = buildDuplicationsShowUrl({
      projectKey: 'p',
      file: 'src/utils/slugify.ts',
      branchAxis: PR_AXIS_42,
    });
    expect(url).toContain('pullRequest=42');
    expect(url).not.toContain('branch=');
  });

  it('respects a custom baseUrl override', () => {
    const url = buildDuplicationsShowUrl({
      baseUrl: 'https://example.test',
      projectKey: 'p',
      file: 'a.ts',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url.startsWith('https://example.test/api/duplications/show?')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMeasuresComponentTreeUrl
// ---------------------------------------------------------------------------

describe('buildMeasuresComponentTreeUrl', () => {
  it('builds the URL with the documented default qualifiers, page size, and page index', () => {
    const url = buildMeasuresComponentTreeUrl({
      projectKey: 'ignored-by-this-builder',
      component: 'p',
      metricKeys: ['duplicated_lines'],
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toBe(
      `${SONARCLOUD_BASE_URL}/api/measures/component_tree?component=p&metricKeys=duplicated_lines&qualifiers=FIL&ps=500&p=1&branch=main`,
    );
  });

  it('joins multi-metric metric keys with commas', () => {
    const url = buildMeasuresComponentTreeUrl({
      component: 'p',
      metricKeys: ['duplicated_lines', 'duplicated_blocks'],
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('metricKeys=duplicated_lines%2Cduplicated_blocks');
  });

  it('respects a qualifiers override', () => {
    const url = buildMeasuresComponentTreeUrl({
      component: 'p',
      metricKeys: ['duplicated_lines'],
      qualifiers: 'DIR',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('qualifiers=DIR');
    expect(url).not.toContain('qualifiers=FIL');
  });

  it('respects ps and p overrides for paginating call sites', () => {
    const url = buildMeasuresComponentTreeUrl({
      component: 'p',
      metricKeys: ['duplicated_lines'],
      ps: 100,
      p: 3,
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('ps=100');
    expect(url).toContain('p=3');
  });

  it('emits &pullRequest=<id> when the axis is a pull request', () => {
    const url = buildMeasuresComponentTreeUrl({
      component: 'p',
      metricKeys: ['duplicated_lines'],
      branchAxis: PR_AXIS_42,
    });
    expect(url).toContain('pullRequest=42');
    expect(url).not.toContain('branch=');
  });
});

// ---------------------------------------------------------------------------
// parseDuplicationsShowResponse
// ---------------------------------------------------------------------------

describe('parseDuplicationsShowResponse', () => {
  it('parses the captured fixture into two clusters with resolved component keys', () => {
    const clusters = parseDuplicationsShowResponse(duplicationsShowFixture);
    expect(clusters).toHaveLength(2);
    for (const cluster of clusters) {
      for (const block of cluster.blocks) {
        expect(block.componentKey).toBe(FIXTURE_PERSPECTIVE_COMPONENT_KEY);
      }
    }
  });

  it('preserves the per-block from and size fields verbatim', () => {
    const clusters = parseDuplicationsShowResponse(duplicationsShowFixture);
    const firstCluster = clusters[0];
    expect(firstCluster.blocks[0]).toMatchObject({
      from: 332,
      size: 23,
      componentKey: FIXTURE_PERSPECTIVE_COMPONENT_KEY,
    });
    expect(firstCluster.blocks).toHaveLength(4);
  });

  it('handles a synthesised cross-file cluster topology by resolving distinct _refs to distinct files', () => {
    const synthetic = {
      duplications: [
        {
          blocks: [
            { from: 10, size: 20, _ref: '1' },
            { from: 50, size: 22, _ref: '2' },
          ],
        },
      ],
      files: {
        1: { key: 'p:src/a.ts', name: 'a.ts' },
        2: { key: 'p:src/b.ts', name: 'b.ts' },
      },
    };
    const clusters = parseDuplicationsShowResponse(synthetic);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].blocks).toHaveLength(2);
    expect(clusters[0].blocks[0].componentKey).toBe('p:src/a.ts');
    expect(clusters[0].blocks[1].componentKey).toBe('p:src/b.ts');
  });

  it('throws when the duplications array is absent', () => {
    expect(() => parseDuplicationsShowResponse({})).toThrow(/duplications array/);
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseDuplicationsShowResponse(null)).toThrow(/not an object/);
  });

  it('returns componentKey: null for blocks whose _ref does not resolve in the files table', () => {
    const orphaned = {
      duplications: [{ blocks: [{ from: 1, size: 10, _ref: '999' }] }],
      files: { 1: { key: 'p:a.ts' } },
    };
    const clusters = parseDuplicationsShowResponse(orphaned);
    expect(clusters[0].blocks[0].componentKey).toBeNull();
  });

  it('tolerates an absent files table', () => {
    const noFiles = {
      duplications: [{ blocks: [{ from: 1, size: 10, _ref: '1' }] }],
    };
    const clusters = parseDuplicationsShowResponse(noFiles);
    expect(clusters[0].blocks[0].componentKey).toBeNull();
  });

  it('drops blocks whose from or size is non-numeric', () => {
    const malformed = {
      duplications: [
        {
          blocks: [
            { from: 'oops', size: 10, _ref: '1' },
            { from: 5, size: 12, _ref: '1' },
          ],
        },
      ],
      files: { 1: { key: 'p:a.ts' } },
    };
    const clusters = parseDuplicationsShowResponse(malformed);
    expect(clusters[0].blocks).toHaveLength(1);
    expect(clusters[0].blocks[0].from).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// parseMeasuresComponentTreeResponse
// ---------------------------------------------------------------------------

describe('parseMeasuresComponentTreeResponse', () => {
  it('parses the captured fixture and filters out value="0" components', () => {
    const result = parseMeasuresComponentTreeResponse(measuresComponentTreeFixture);
    // Five fixture rows have non-zero values; one has empty measures.
    expect(result.files.length).toBeGreaterThan(0);
    for (const entry of result.files) {
      expect(entry.duplicatedLines).toBeGreaterThan(0);
    }
  });

  it('Number()-coerces the string measure value (e.g. "160" → 160)', () => {
    const result = parseMeasuresComponentTreeResponse(measuresComponentTreeFixture);
    const services = result.files.find(
      (f) => f.componentKey === `${FIXTURE_PROJECT_KEY}:src/data/services.ts`,
    );
    expect(services).toBeDefined();
    expect(typeof services?.duplicatedLines).toBe('number');
    expect(services?.duplicatedLines).toBe(160);
  });

  it('drops components with absent measures arrays', () => {
    const result = parseMeasuresComponentTreeResponse(measuresComponentTreeFixture);
    const formatTs = result.files.find(
      (f) => f.componentKey === `${FIXTURE_PROJECT_KEY}:src/utils/format.ts`,
    );
    expect(formatTs).toBeUndefined();
  });

  it('returns the three-field paging shape so the orchestrator can drive pagination', () => {
    const result = parseMeasuresComponentTreeResponse(measuresComponentTreeFixture);
    expect(Object.keys(result.paging).sort((a, b) => a.localeCompare(b))).toEqual([
      'pageIndex',
      'pageSize',
      'total',
    ]);
    expect(result.paging.pageIndex).toBe(1);
    expect(result.paging.pageSize).toBe(500);
    expect(result.paging.total).toBe(7);
  });

  it('throws when the components array is absent', () => {
    expect(() => parseMeasuresComponentTreeResponse({ paging: {} })).toThrow(/components array/);
  });

  it('throws when paging is absent', () => {
    expect(() => parseMeasuresComponentTreeResponse({ components: [] })).toThrow(/paging object/);
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseMeasuresComponentTreeResponse(null)).toThrow(/not an object/);
  });

  it('drops components with a non-string value (defensive)', () => {
    const malformed = {
      paging: { pageIndex: 1, pageSize: 500, total: 1 },
      components: [
        {
          key: 'p:a.ts',
          measures: [{ metric: 'duplicated_lines', value: 42 }],
        },
      ],
    };
    const result = parseMeasuresComponentTreeResponse(malformed);
    expect(result.files).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapDuplicationToFindings
// ---------------------------------------------------------------------------

describe('mapDuplicationToFindings', () => {
  it('projects a same-file cluster to one finding per block (synthetic rule key, message names sibling regions)', () => {
    const cluster = {
      blocks: [
        { from: 10, size: 20, componentKey: 'p:a.ts' },
        { from: 50, size: 22, componentKey: 'p:a.ts' },
      ],
    };
    const findings = mapDuplicationToFindings(cluster, 'p', 'a.ts');
    expect(findings).toHaveLength(2);
    expect(findings[0].rule).toBe(DUPLICATIONS_RULE_KEY);
    expect(findings[0]).toMatchObject({ file: 'a.ts', line: 10, size: 20 });
    expect(findings[0].message).toContain('line 50');
    expect(findings[1].message).toContain('line 10');
  });

  it('projects a cross-file cluster to one finding for the perspective file with a partner-file message', () => {
    const cluster = {
      blocks: [
        { from: 10, size: 20, componentKey: 'p:a.ts' },
        { from: 50, size: 22, componentKey: 'p:b.ts' },
      ],
    };
    const findings = mapDuplicationToFindings(cluster, 'p', 'a.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('a.ts');
    expect(findings[0].message).toContain('p:b.ts');
    expect(findings[0].message).toContain('duplicated with');
  });

  it('skips blocks whose componentKey is null (unresolved _ref)', () => {
    const cluster = {
      blocks: [
        { from: 10, size: 20, componentKey: 'p:a.ts' },
        { from: 50, size: 22, componentKey: null },
      ],
    };
    const findings = mapDuplicationToFindings(cluster, 'p', 'a.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(10);
  });

  it('returns an empty array when the perspective file is absent from the cluster', () => {
    const cluster = {
      blocks: [
        { from: 10, size: 20, componentKey: 'p:c.ts' },
        { from: 50, size: 22, componentKey: 'p:d.ts' },
      ],
    };
    const findings = mapDuplicationToFindings(cluster, 'p', 'a.ts');
    expect(findings).toEqual([]);
  });

  it('preserves from as line and size as size for each emitted finding', () => {
    const cluster = {
      blocks: [{ from: 7, size: 67, componentKey: 'p:a.ts' }],
    };
    const findings = mapDuplicationToFindings(cluster, 'p', 'a.ts');
    expect(findings[0].line).toBe(7);
    expect(findings[0].size).toBe(67);
  });
});

// ---------------------------------------------------------------------------
// dedupeDuplicationFindings
// ---------------------------------------------------------------------------

describe('dedupeDuplicationFindings', () => {
  it('collapses duplicate (file, line, size) tuples to a single entry', () => {
    const findings = [
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 20, message: 'first' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 20, message: 'second' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 50, size: 22, message: 'third' },
    ];
    const deduped = dedupeDuplicationFindings(findings);
    expect(deduped).toHaveLength(2);
  });

  it('preserves entries that differ on any of (file, line, size)', () => {
    const findings = [
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 20, message: '' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 21, message: '' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 11, size: 20, message: '' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'b.ts', line: 10, size: 20, message: '' },
    ];
    const deduped = dedupeDuplicationFindings(findings);
    expect(deduped).toHaveLength(4);
  });

  it('returns a new array; does not mutate the input', () => {
    const findings = [
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 20, message: '' },
    ];
    const deduped = dedupeDuplicationFindings(findings);
    expect(deduped).not.toBe(findings);
    expect(findings).toHaveLength(1);
  });

  it('sorts the output by (file, line, rule)', () => {
    const findings = [
      { rule: DUPLICATIONS_RULE_KEY, file: 'b.ts', line: 5, size: 10, message: '' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 10, size: 20, message: '' },
      { rule: DUPLICATIONS_RULE_KEY, file: 'a.ts', line: 5, size: 30, message: '' },
    ];
    const deduped = dedupeDuplicationFindings(findings);
    expect(deduped.map((f) => `${f.file}:${f.line}`)).toEqual(['a.ts:5', 'a.ts:10', 'b.ts:5']);
  });

  it('returns an empty array on empty input', () => {
    expect(dedupeDuplicationFindings([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exported constants — threshold-stability contract (ADR-0046)
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('DUPLICATIONS_RULE_KEY is the synthetic sonarcloud:duplicated-block string', () => {
    expect(DUPLICATIONS_RULE_KEY).toBe('sonarcloud:duplicated-block');
  });

  it('DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE matches the SonarCloud server cap of 500', () => {
    expect(DEFAULT_MEASURES_COMPONENT_TREE_PAGE_SIZE).toBe(500);
  });

  it('MEASURES_COMPONENT_TREE_HARD_CAP_PAGES is 10 (5000 components at ps=500)', () => {
    expect(MEASURES_COMPONENT_TREE_HARD_CAP_PAGES).toBe(10);
  });
});
