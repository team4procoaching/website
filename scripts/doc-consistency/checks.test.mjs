import { describe, expect, it } from 'vitest';

import {
  checkS1Block,
  checkS2PrecedenceLine,
  checkS3InlineXref,
  extractBulletContaining,
  extractLinkTargets,
  extractSection,
  groupParagraphs,
  isWhollyEmphasised,
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
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
    expect(findings[0].shape).toBe('S1');
  });

  it('reports absence when the section anchor is missing', () => {
    const lines = ['## Other Section', 'content'];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
  });

  it('reports malformation when the expected link is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: the docs/AGENTS.md side wins._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('missing a link');
  });

  it('reports malformation when the link points at the wrong target', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/OTHER.md#elsewhere). The docs/OTHER.md side wins._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('missing a link');
  });

  it('reports malformation when the "side wins" clause is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/AGENTS.md#the-seven-subagents)._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('side wins');
  });

  it('does not treat a non-italic paragraph mentioning Canonical source as the note', () => {
    const lines = [
      '## Agent Architecture',
      '',
      'The Canonical source is documented elsewhere with a link [x](docs/AGENTS.md#the-seven-subagents) side wins.',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
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
    const findings = runS2(lines, S2_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
    expect(findings[0].shape).toBe('S2');
  });

  it('reports absence when the section anchor is missing', () => {
    const findings = runS2(['## Other Section', 'content'], S2_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
  });

  it('reports malformation when the canonical-source phrase is missing', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary — on conflict, canonical wins._',
    ];
    const findings = runS2(lines, S2_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('canonical prose lives in');
  });

  it('reports malformation when the "canonical wins" clause is missing', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      '_Each rule is a summary; canonical prose lives in `docs/CONVENTIONS.md`._',
    ];
    const findings = runS2(lines, S2_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('canonical wins');
  });

  it('does not treat a non-italic paragraph mentioning "is a summary" as the line', () => {
    const lines = [
      '## Critical Rules (never break these)',
      '',
      'A subagent return is a summary, not the full work; canonical prose lives in docs and canonical wins.',
    ];
    const findings = runS2(lines, S2_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
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
    const findings = runS3(lines, S3_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].shape).toBe('S3');
    expect(findings[0].message).toContain('ARCHITECTURE.md#adr-lifecycle');
  });

  it('reports malformation when the bullet links a different target', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Numbers new ADRs — see [elsewhere](docs/OTHER.md#not-lifecycle).',
    ];
    const findings = runS3(lines, S3_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
  });

  it('reports absence when the lead phrase is gone entirely (safe-noisy direction)', () => {
    const lines = [
      '### Orchestrator Responsibilities',
      '',
      '- Assigns ADR numbers — see [link](docs/ARCHITECTURE.md#adr-lifecycle).',
    ];
    const findings = runS3(lines, S3_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
    expect(findings[0].shape).toBe('S3');
  });

  it('reports absence when the section anchor is missing', () => {
    const findings = runS3(['## Other Section', 'content'], S3_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
  });
});
