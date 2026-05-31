import { describe, expect, it } from 'vitest';

import {
  checkS1Block,
  checkS2PrecedenceLine,
  checkS3InlineXref,
  compareRosters,
  extractBulletContaining,
  extractLinkTargets,
  extractSection,
  groupParagraphs,
  isWhollyEmphasised,
  normaliseRosterCells,
  parseRosterTable,
  slugifyHeading,
} from './checks.mjs';

// ---------------------------------------------------------------------------
// Helpers: run a check and return the findings array
// ---------------------------------------------------------------------------

function runS1(lines, descriptor) {
  const findings = [];
  checkS1Block('test.md', lines, descriptor, findings);
  return findings;
}

function runS2(lines, descriptor) {
  const findings = [];
  checkS2PrecedenceLine('test.md', lines, descriptor, findings);
  return findings;
}

function runS3(lines, descriptor) {
  const findings = [];
  checkS3InlineXref('test.md', lines, descriptor, findings);
  return findings;
}

/**
 * Assert that `findings` holds exactly one finding matching the given fields.
 * `kind` is required; `shape`, `file`, and each entry of `messageIncludes` are
 * checked only when supplied. Collapses the repeated single-finding assertion
 * tail shared across the S1/S2/S3 and roster suites.
 *
 * @param {Array<{ kind: string, shape?: string, file?: string, message?: string }>} findings
 * @param {{ kind: string, shape?: string, file?: string, messageIncludes?: string[] }} expected
 */
function expectSingleFinding(findings, { kind, shape, file, messageIncludes = [] }) {
  expect(findings).toHaveLength(1);
  expect(findings[0].kind).toBe(kind);
  if (shape !== undefined) {
    expect(findings[0].shape).toBe(shape);
  }
  if (file !== undefined) {
    expect(findings[0].file).toBe(file);
  }
  for (const fragment of messageIncludes) {
    expect(findings[0].message).toContain(fragment);
  }
}

const S1_DESCRIPTOR = {
  sectionAnchor: 'agent-architecture',
  expectedLinkTarget: 'docs/AGENTS.md#the-seven-subagents',
};

const S2_DESCRIPTOR = {
  sectionAnchor: 'critical-rules-never-break-these',
};

const S3_DESCRIPTOR = {
  sectionAnchor: 'orchestrator-responsibilities',
  leadPhrase: 'Numbers new ADRs',
  expectedLinkTarget: 'ARCHITECTURE.md#adr-lifecycle',
};

// ---------------------------------------------------------------------------
// slugifyHeading
// ---------------------------------------------------------------------------

describe('slugifyHeading', () => {
  it('lowercases and hyphenates plain headings', () => {
    expect(slugifyHeading('The Seven Subagents')).toBe('the-seven-subagents');
  });

  it('strips parentheses and other punctuation', () => {
    expect(slugifyHeading('Critical Rules (never break these)')).toBe(
      'critical-rules-never-break-these',
    );
  });

  it('strips backtick fences and ampersands the way GitHub anchors do', () => {
    expect(slugifyHeading('Update Strategy & Package Rules')).toBe(
      'update-strategy--package-rules',
    );
  });

  it('handles surrounding whitespace', () => {
    expect(slugifyHeading('  Agent Architecture  ')).toBe('agent-architecture');
  });
});

// ---------------------------------------------------------------------------
// extractSection
// ---------------------------------------------------------------------------

describe('extractSection', () => {
  it('returns body lines up to the next same-level heading', () => {
    const lines = [
      '## Agent Architecture',
      'intro line',
      '',
      'second line',
      '## Next Section',
      'other content',
    ];
    expect(extractSection(lines, 'agent-architecture')).toEqual(['intro line', '', 'second line']);
  });

  it('does not stop at a deeper-level heading inside the section', () => {
    const lines = ['## Outer', 'a', '### Inner', 'b', '## Sibling', 'c'];
    expect(extractSection(lines, 'outer')).toEqual(['a', '### Inner', 'b']);
  });

  it('stops at a higher-level heading', () => {
    const lines = ['### Deep', 'a', '## Shallow', 'b'];
    expect(extractSection(lines, 'deep')).toEqual(['a']);
  });

  it('returns empty array when the anchor is not found', () => {
    expect(extractSection(['## Other', 'x'], 'missing')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// groupParagraphs
// ---------------------------------------------------------------------------

describe('groupParagraphs', () => {
  it('joins multi-line paragraphs with single spaces', () => {
    const lines = ['first line', 'second line', '', 'third line'];
    expect(groupParagraphs(lines)).toEqual(['first line second line', 'third line']);
  });

  it('drops blank-only runs', () => {
    expect(groupParagraphs(['', '  ', 'only'])).toEqual(['only']);
  });
});

// ---------------------------------------------------------------------------
// isWhollyEmphasised
// ---------------------------------------------------------------------------

describe('isWhollyEmphasised', () => {
  it('accepts an underscore-wrapped paragraph', () => {
    expect(isWhollyEmphasised('_Canonical source for X._')).toBe(true);
  });

  it('accepts a single-asterisk-wrapped paragraph', () => {
    expect(isWhollyEmphasised('*emphasised*')).toBe(true);
  });

  it('rejects a bold (double-asterisk) paragraph', () => {
    expect(isWhollyEmphasised('**bold**')).toBe(false);
  });

  it('rejects a non-emphasised paragraph', () => {
    expect(isWhollyEmphasised('plain text')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractLinkTargets
// ---------------------------------------------------------------------------

describe('extractLinkTargets', () => {
  it('extracts the URL part, not the label', () => {
    expect(
      extractLinkTargets('see [`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents)'),
    ).toEqual(['docs/AGENTS.md#the-seven-subagents']);
  });

  it('extracts multiple link targets in order', () => {
    expect(extractLinkTargets('[a](one) and [b](two)')).toEqual(['one', 'two']);
  });

  it('returns empty array when no links present', () => {
    expect(extractLinkTargets('no links here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkS1Block
// ---------------------------------------------------------------------------

describe('checkS1Block', () => {
  it('passes a well-formed single-line italic block', () => {
    const lines = [
      '## Agent Architecture',
      'intro',
      '',
      '_Canonical source for this roster: [`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents). On disagreement, the docs/AGENTS.md side wins._',
    ];
    expect(runS1(lines, S1_DESCRIPTOR)).toHaveLength(0);
  });

  it('passes a well-formed MULTI-LINE italic paragraph (paragraph-join proof)', () => {
    const lines = [
      '## Agent Architecture',
      'intro',
      '',
      '_Canonical source for this roster:',
      '[`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents). On',
      'disagreement, the docs/AGENTS.md side wins._',
    ];
    expect(runS1(lines, S1_DESCRIPTOR)).toHaveLength(0);
  });

  it('reports absence when no Canonical-source italic paragraph exists', () => {
    const lines = ['## Agent Architecture', 'intro', '', 'just some prose.'];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), { kind: 'absence', shape: 'S1' });
  });

  it('reports absence when the section anchor is missing', () => {
    const lines = ['## Other Section', 'content'];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), { kind: 'absence' });
  });

  it('reports malformation when the expected link is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: the docs/AGENTS.md side wins._',
    ];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), {
      kind: 'malformation',
      messageIncludes: ['missing a link'],
    });
  });

  it('reports malformation when the link points at the wrong target', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/OTHER.md#elsewhere). The docs/OTHER.md side wins._',
    ];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), {
      kind: 'malformation',
      messageIncludes: ['missing a link'],
    });
  });

  it('reports malformation when the "side wins" clause is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/AGENTS.md#the-seven-subagents)._',
    ];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), {
      kind: 'malformation',
      messageIncludes: ['side wins'],
    });
  });

  it('does not treat a non-italic paragraph mentioning Canonical source as the note', () => {
    const lines = [
      '## Agent Architecture',
      '',
      'The Canonical source is documented elsewhere with a link [x](docs/AGENTS.md#the-seven-subagents) side wins.',
    ];
    expectSingleFinding(runS1(lines, S1_DESCRIPTOR), { kind: 'absence' });
  });
});

// ---------------------------------------------------------------------------
// checkS2PrecedenceLine
// ---------------------------------------------------------------------------

describe('checkS2PrecedenceLine', () => {
  it('passes a well-formed link-less precedence line', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary; canonical prose lives in `docs/CONVENTIONS.md` / the cited ADR — on conflict, canonical wins._',
    ];
    expect(runS2(lines, S2_DESCRIPTOR)).toHaveLength(0);
  });

  it('passes even though the line carries NO Markdown link (no-link regression guard)', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary; canonical prose lives in the cited ADR — on conflict, canonical wins._',
    ];
    // The shape deliberately does not require a link; a link-less paragraph is
    // well-formed and must not be reported.
    expect(runS2(lines, S2_DESCRIPTOR)).toHaveLength(0);
  });

  it('reports absence when no "is a summary" italic paragraph exists', () => {
    const lines = ['## Critical Rules (never break these)', '', 'just some prose.'];
    expectSingleFinding(runS2(lines, S2_DESCRIPTOR), { kind: 'absence', shape: 'S2' });
  });

  it('reports absence when the section anchor is missing', () => {
    expectSingleFinding(runS2(['## Other Section', 'content'], S2_DESCRIPTOR), { kind: 'absence' });
  });

  it('reports malformation when the canonical-source phrase is missing', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary — on conflict, canonical wins._',
    ];
    expectSingleFinding(runS2(lines, S2_DESCRIPTOR), {
      kind: 'malformation',
      messageIncludes: ['canonical prose lives in'],
    });
  });

  it('reports malformation when the "canonical wins" clause is missing', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary; canonical prose lives in `docs/CONVENTIONS.md`._',
    ];
    expectSingleFinding(runS2(lines, S2_DESCRIPTOR), {
      kind: 'malformation',
      messageIncludes: ['canonical wins'],
    });
  });

  it('does not treat a non-italic paragraph mentioning "is a summary" as the line', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      'A subagent return is a summary, not the full work; canonical prose lives in docs and canonical wins.',
    ];
    expectSingleFinding(runS2(lines, S2_DESCRIPTOR), { kind: 'absence' });
  });
});

// ---------------------------------------------------------------------------
// extractBulletContaining
// ---------------------------------------------------------------------------

describe('extractBulletContaining', () => {
  it('joins a multi-line bullet into one string', () => {
    const lines = [
      '- Numbers new ADRs (next free integer). In parallel-session',
      '  scenarios, verify before assigning — see',
      '  [link](docs/ARCHITECTURE.md#adr-lifecycle).',
      '- Another bullet',
    ];
    expect(extractBulletContaining(lines, 'Numbers new ADRs')).toBe(
      'Numbers new ADRs (next free integer). In parallel-session scenarios, verify before assigning — see [link](docs/ARCHITECTURE.md#adr-lifecycle).',
    );
  });

  it('returns only the matching bullet, not adjacent bullets', () => {
    const lines = [
      '- Some other duty, see [x](docs/OTHER.md#elsewhere)',
      '- Numbers new ADRs here',
      '- Yet another duty',
    ];
    expect(extractBulletContaining(lines, 'Numbers new ADRs')).toBe('Numbers new ADRs here');
  });

  it('returns null when no bullet contains the lead phrase', () => {
    expect(extractBulletContaining(['- a', '- b'], 'Numbers new ADRs')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkS3InlineXref
// ---------------------------------------------------------------------------

describe('checkS3InlineXref', () => {
  it('passes a well-formed inline see-cross-reference', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Assigns task IDs',
      '- Numbers new ADRs (next free integer). Gaps are expected — see',
      '  [`docs/ARCHITECTURE.md` § ADR Lifecycle](docs/ARCHITECTURE.md#adr-lifecycle).',
      '- Writes commits',
    ];
    expect(runS3(lines, S3_DESCRIPTOR)).toHaveLength(0);
  });

  it('does NOT fire on an ordinary inline see-link in another bullet (false-positive guard)', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Some unrelated duty — see [a guide](docs/OTHER.md#some-anchor).',
      '- Numbers new ADRs (next free integer). Gaps are expected — see',
      '  [adr lifecycle](docs/ARCHITECTURE.md#adr-lifecycle).',
      '- Another duty — see [more](docs/MORE.md#x).',
    ];
    // The unrelated see-links must not add findings; only the lead-phrase bullet
    // is policed, and it is well-formed.
    expect(runS3(lines, S3_DESCRIPTOR)).toHaveLength(0);
  });

  it('reports malformation when the lead-phrase bullet drops the adr-lifecycle target', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Numbers new ADRs (next free integer). Verify before assigning.',
    ];
    expectSingleFinding(runS3(lines, S3_DESCRIPTOR), {
      kind: 'malformation',
      shape: 'S3',
      messageIncludes: ['ARCHITECTURE.md#adr-lifecycle'],
    });
  });

  it('reports malformation when the bullet links a different target', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Numbers new ADRs — see [elsewhere](docs/OTHER.md#not-lifecycle).',
    ];
    expectSingleFinding(runS3(lines, S3_DESCRIPTOR), { kind: 'malformation' });
  });

  it('reports absence when the lead phrase is gone entirely (safe-noisy direction)', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Assigns ADR numbers — see [link](docs/ARCHITECTURE.md#adr-lifecycle).',
    ];
    expectSingleFinding(runS3(lines, S3_DESCRIPTOR), { kind: 'absence', shape: 'S3' });
  });

  it('reports absence when the section anchor is missing', () => {
    expectSingleFinding(runS3(['## Other Section', 'content'], S3_DESCRIPTOR), { kind: 'absence' });
  });
});

// ---------------------------------------------------------------------------
// Roster equality — fixtures mirroring the three live shapes
// ---------------------------------------------------------------------------

// CLAUDE.md shape: Agent | Phase | Role | Model, phase as a BARE number.
function claudeRoster(rows) {
  return [
    '## Agent Architecture',
    'intro prose',
    '',
    '| Agent | Phase | Role | Model |',
    '| :--- | :--- | :--- | :--- |',
    ...rows,
    '',
    '## Next Section',
  ];
}

// AGENTS.md shape: Agent | Phase | Role | Model, phase as `Phase N`.
function agentsRoster(rows) {
  return [
    '## The Seven Subagents',
    'intro prose',
    '',
    '| Agent | Phase | Role | Model |',
    '| :--- | :--- | :--- | :--- |',
    ...rows,
    '',
    '## Phase-Aligned Agents',
  ];
}

// ADR-0035 shape: Agent | Phase | Role (NO Model column), phase as `Phase N`.
function adrRoster(rows) {
  return [
    '## Decision',
    'intro prose',
    '',
    '| Agent | Phase | Role |',
    '| :--- | :--- | :--- |',
    ...rows,
    '',
    '## Consequences',
  ];
}

const ROSTER_DESCRIPTOR = {
  sources: [
    { file: 'CLAUDE.md', sectionAnchor: 'agent-architecture' },
    { file: 'docs/AGENTS.md', sectionAnchor: 'the-seven-subagents' },
    { file: 'docs/adr/0035.md', sectionAnchor: 'decision' },
  ],
  keyColumn: 'Agent',
  authoritativeColumns: ['Agent', 'Role'],
  phaseColumn: 'Phase',
  optionalColumns: ['Model'],
};

// The three live roster bodies, in their distinct shapes. Agent IDs and Role
// text are identical across all three; only Phase form and Model presence differ.
const LIVE_CLAUDE_ROWS = [
  '| `requirements-analyst` | 1 | Produces requirements documents, asks clarifying questions | opus |',
  '| `architect` | 2 | Produces concept documents and ADRs with commit plans | opus |',
  '| `implementer` | 3 | Executes concept documents commit-by-commit | sonnet |',
  '| `debt-auditor` | — | Systematic debt hunt within a defined category | sonnet |',
  '| `copy-editor` | post-hoc | Opt-in text review for ADRs, concepts, public content | sonnet |',
];
const LIVE_AGENTS_ROWS = [
  '| `requirements-analyst` | Phase 1 | Produces requirements documents, asks clarifying questions | opus |',
  '| `architect` | Phase 2 | Produces concept documents and ADRs with commit plans | opus |',
  '| `implementer` | Phase 3 | Executes concept documents commit-by-commit | sonnet |',
  '| `debt-auditor` | — | Systematic debt hunt within a defined category | sonnet |',
  '| `copy-editor` | post-hoc | Opt-in text review for ADRs, concepts, public content | sonnet |',
];
const LIVE_ADR_ROWS = [
  '| `requirements-analyst` | Phase 1 | Produces requirements documents, asks clarifying questions |',
  '| `architect` | Phase 2 | Produces concept documents and ADRs with commit plans |',
  '| `implementer` | Phase 3 | Executes concept documents commit-by-commit |',
  '| `debt-auditor` | — | Systematic debt hunt within a defined category |',
  '| `copy-editor` | post-hoc | Opt-in text review for ADRs, concepts, public content |',
];

function runRoster({ claude = LIVE_CLAUDE_ROWS, agents = LIVE_AGENTS_ROWS, adr = LIVE_ADR_ROWS }) {
  const docs = new Map([
    ['CLAUDE.md', claudeRoster(claude)],
    ['docs/AGENTS.md', agentsRoster(agents)],
    ['docs/adr/0035.md', adrRoster(adr)],
  ]);
  const findings = [];
  compareRosters(docs, ROSTER_DESCRIPTOR, findings);
  return findings;
}

/**
 * Return a copy of `rows` with the row at `index` swapped for `replacement`.
 * Keeps the single-edit roster fixtures to a one-liner instead of a re-typed
 * five-row literal, so each divergence test states only the row it perturbs.
 *
 * @param {readonly string[]} rows
 * @param {number} index
 * @param {string} replacement
 * @returns {string[]}
 */
function withRow(rows, index, replacement) {
  const copy = [...rows];
  copy[index] = replacement;
  return copy;
}

// ---------------------------------------------------------------------------
// normaliseRosterCells
// ---------------------------------------------------------------------------

describe('normaliseRosterCells', () => {
  it('strips a leading "Phase " token from the phase column', () => {
    expect(normaliseRosterCells('Phase', 'Phase 1', 'Phase')).toBe('1');
  });

  it('leaves a bare-number phase cell unchanged', () => {
    expect(normaliseRosterCells('Phase', '1', 'Phase')).toBe('1');
  });

  it('passes "—" and "post-hoc" phase cells through literally', () => {
    expect(normaliseRosterCells('Phase', '—', 'Phase')).toBe('—');
    expect(normaliseRosterCells('Phase', 'post-hoc', 'Phase')).toBe('post-hoc');
  });

  it('strips backtick fences from a non-phase column', () => {
    expect(normaliseRosterCells('Agent', '`requirements-analyst`', 'Phase')).toBe(
      'requirements-analyst',
    );
  });

  it('collapses internal whitespace in a non-phase column', () => {
    expect(normaliseRosterCells('Role', 'Produces   requirements   documents', 'Phase')).toBe(
      'Produces requirements documents',
    );
  });
});

// ---------------------------------------------------------------------------
// parseRosterTable
// ---------------------------------------------------------------------------

describe('parseRosterTable', () => {
  it('maps cells by header name, not positional index', () => {
    const table = parseRosterTable(claudeRoster(LIVE_CLAUDE_ROWS), 'agent-architecture', 'Phase');
    expect(table.columns).toEqual(['Agent', 'Phase', 'Role', 'Model']);
    expect(table.rows[0].Agent).toBe('requirements-analyst');
    expect(table.rows[0].Role).toBe('Produces requirements documents, asks clarifying questions');
    // Header-keyed access yields the same Role regardless of the absent-Model
    // column shifting nothing here — proving name-keying, not index-keying.
    const adrTable = parseRosterTable(adrRoster(LIVE_ADR_ROWS), 'decision', 'Phase');
    expect(adrTable.columns).toEqual(['Agent', 'Phase', 'Role']);
    expect(adrTable.rows[0].Role).toBe(
      'Produces requirements documents, asks clarifying questions',
    );
    expect(adrTable.rows[0].Model).toBeUndefined();
  });

  it('normalises the phase column on parse (Phase 1 → 1)', () => {
    const table = parseRosterTable(agentsRoster(LIVE_AGENTS_ROWS), 'the-seven-subagents', 'Phase');
    expect(table.rows[0].Phase).toBe('1');
  });

  it('returns null when the section has no table', () => {
    const lines = ['## Agent Architecture', 'just prose', '', '## Next'];
    expect(parseRosterTable(lines, 'agent-architecture', 'Phase')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// compareRosters — equality across the three non-identical live shapes
// ---------------------------------------------------------------------------

describe('compareRosters', () => {
  it('finds NO divergence across the three live (non-identical) roster shapes', () => {
    // This is the load-bearing pass: the bare-number-vs-`Phase N` phase form and
    // the present-vs-absent Model column must both be absorbed by the contract.
    expect(runRoster({})).toHaveLength(0);
  });

  it('does NOT diverge on the `1`-vs-`Phase 1` phase difference (every-run guard)', () => {
    // CLAUDE.md bare numbers vs AGENTS.md/ADR `Phase N` — a naive cell-equality
    // check would fire here on every run.
    const findings = runRoster({});
    expect(findings.filter((f) => f.message.includes('Phase'))).toHaveLength(0);
  });

  it('does NOT diverge on Model present (CLAUDE/AGENTS) vs absent (ADR) (every-run guard)', () => {
    const findings = runRoster({});
    expect(findings.filter((f) => f.message.includes('Model'))).toHaveLength(0);
  });

  it('reports divergence when a Role text differs in one copy', () => {
    const agents = withRow(
      LIVE_AGENTS_ROWS,
      0,
      '| `requirements-analyst` | Phase 1 | Produces requirements documents, REWORDED | opus |',
    );
    expectSingleFinding(runRoster({ agents }), {
      kind: 'divergence',
      shape: 'roster',
      file: 'docs/AGENTS.md',
      messageIncludes: ['Role', 'requirements-analyst'],
    });
  });

  it('reports divergence when a Phase genuinely differs (after normalisation)', () => {
    // architect listed as Phase 3 in ADR but Phase 2 elsewhere — a real divergence
    // that survives the leading-`Phase ` strip.
    const adr = withRow(
      LIVE_ADR_ROWS,
      1,
      '| `architect` | Phase 3 | Produces concept documents and ADRs with commit plans |',
    );
    expectSingleFinding(runRoster({ adr }), {
      kind: 'divergence',
      messageIncludes: ['Phase', 'architect'],
    });
  });

  it('reports divergence when the Model column differs BETWEEN the copies that carry it', () => {
    // CLAUDE and AGENTS both carry Model; ADR does not. A Model mismatch between
    // CLAUDE and AGENTS IS a divergence (the optional-column rule only suppresses
    // present-vs-absent, not present-vs-present).
    const agents = withRow(
      LIVE_AGENTS_ROWS,
      0,
      '| `requirements-analyst` | Phase 1 | Produces requirements documents, asks clarifying questions | sonnet |',
    );
    expectSingleFinding(runRoster({ agents }), {
      kind: 'divergence',
      messageIncludes: ['Model', 'requirements-analyst'],
    });
  });

  it('reports divergence when an agent is missing from one copy', () => {
    const adr = [
      '| `requirements-analyst` | Phase 1 | Produces requirements documents, asks clarifying questions |',
      '| `architect` | Phase 2 | Produces concept documents and ADRs with commit plans |',
      '| `implementer` | Phase 3 | Executes concept documents commit-by-commit |',
      '| `copy-editor` | post-hoc | Opt-in text review for ADRs, concepts, public content |',
    ];
    expectSingleFinding(runRoster({ adr }), {
      kind: 'divergence',
      messageIncludes: ['Agent-set'],
    });
  });

  it('reports divergence when a copy has an extra agent', () => {
    const agents = [
      ...LIVE_AGENTS_ROWS,
      '| `interloper` | Phase 5 | A duty that exists nowhere else | opus |',
    ];
    expectSingleFinding(runRoster({ agents }), {
      kind: 'divergence',
      messageIncludes: ['Agent-set'],
    });
  });

  it('reports divergence when rows are reordered', () => {
    const [first, second, ...rest] = LIVE_AGENTS_ROWS;
    const agents = [second, first, ...rest];
    expectSingleFinding(runRoster({ agents }), {
      kind: 'divergence',
      messageIncludes: ['Agent-set'],
    });
  });

  it('reports absence when a copy has no roster table at all', () => {
    const docs = new Map([
      ['CLAUDE.md', claudeRoster(LIVE_CLAUDE_ROWS)],
      ['docs/AGENTS.md', agentsRoster(LIVE_AGENTS_ROWS)],
      ['docs/adr/0035.md', ['## Decision', 'just prose, no table', '', '## Consequences']],
    ]);
    const findings = [];
    compareRosters(docs, ROSTER_DESCRIPTOR, findings);
    expectSingleFinding(findings, { kind: 'absence', file: 'docs/adr/0035.md' });
  });
});
