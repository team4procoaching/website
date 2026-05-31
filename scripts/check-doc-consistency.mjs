/**
 * Advisory CLI sensor for cross-document consistency annotations.
 *
 * Detects three classes of silent documentation drift that pnpm check, Biome,
 * astro check, and the Lychee link-validation CI job all let through:
 *   - missing or malformed canonical-pointer-notes (three note shapes), and
 *   - divergence across the three hand-maintained agent-roster table copies.
 *
 * Advisory posture (ADR-0060). Because the sensor is spliced into the local
 * `pnpm check` `&&` chain — where there is no wrapping hook to swallow a non-zero
 * exit — the advisory posture lives inside the script: it ALWAYS process.exit(0)
 * on both the clean and the findings path. Only an internal error (a guarded
 * document is unreadable / absent — a tooling fault, not a policy finding) exits
 * non-zero, matching the query-* failure-path convention.
 *
 * Stdout output contract (ADR-0060, the stable discriminator). On every
 * non-error run the stdout ends with a single sentinel line:
 *
 *     Doc-consistency findings: <N>
 *
 * where <N> is the non-negative finding count (0 on a clean run). The literal
 * prefix `Doc-consistency findings: ` is FIXED and is the sole token any consumer
 * (the CI step, the tests) keys on; the human-readable header/detail/confirmation
 * lines above it may be reworded freely. On an internal error the sentinel is NOT
 * emitted (no policy pass completed) and the exit code is non-zero.
 *
 * Layout: the pure recognition/comparison functions live in
 * ./doc-consistency/checks.mjs and the policy data in
 * ./doc-consistency/expectations.mjs, so both are unit-testable without
 * filesystem access. This file keeps the I/O wiring and the runner block.
 *
 * Usage:
 *   node scripts/check-doc-consistency.mjs
 *   pnpm check:doc-consistency
 */

import { readFile } from 'node:fs/promises';

import {
  checkS1Block,
  checkS2PrecedenceLine,
  checkS3InlineXref,
  compareRosters,
} from './doc-consistency/checks.mjs';
import {
  ROSTER_DESCRIPTOR,
  S1_DESCRIPTORS,
  S2_DESCRIPTORS,
  S3_DESCRIPTORS,
} from './doc-consistency/expectations.mjs';
import { formatSentinel } from './doc-consistency/sentinel.mjs';

/**
 * Reads the unique set of files named by a list of descriptors and returns a
 * Map of file → line array. Throws on an unreadable file (internal-error path).
 *
 * @param {readonly { file: string }[]} descriptors
 * @returns {Promise<Map<string, string[]>>}
 */
async function readDocs(descriptors) {
  const files = [...new Set(descriptors.map((d) => d.file))];
  const docs = new Map();
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    docs.set(file, content.split('\n'));
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  const findings = [];

  const docs = await readDocs([
    ...S1_DESCRIPTORS,
    ...S2_DESCRIPTORS,
    ...S3_DESCRIPTORS,
    ...ROSTER_DESCRIPTOR.sources,
  ]);

  for (const descriptor of S1_DESCRIPTORS) {
    const lines = docs.get(descriptor.file);
    checkS1Block(descriptor.file, lines, descriptor, findings);
  }

  for (const descriptor of S2_DESCRIPTORS) {
    const lines = docs.get(descriptor.file);
    checkS2PrecedenceLine(descriptor.file, lines, descriptor, findings);
  }

  for (const descriptor of S3_DESCRIPTORS) {
    const lines = docs.get(descriptor.file);
    checkS3InlineXref(descriptor.file, lines, descriptor, findings);
  }

  compareRosters(docs, ROSTER_DESCRIPTOR, findings);

  // Deterministic ordering: file → anchor → shape → kind.
  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.anchor.localeCompare(b.anchor) ||
      a.shape.localeCompare(b.shape) ||
      a.kind.localeCompare(b.kind),
  );

  if (findings.length === 0) {
    console.log('doc-consistency (advisory): all enrolled surfaces well-formed');
  } else {
    console.log('doc-consistency (advisory):');
    for (const f of findings) {
      console.log(`  ${f.file} [${f.anchor}] (${f.shape}/${f.kind}): ${f.message}`);
    }
  }

  // The pinned sentinel is always the LAST stdout line on a non-error run.
  console.log(formatSentinel(findings.length));
  process.exit(0);
} catch (error) {
  // Internal error (unreadable/absent guarded doc): non-zero exit, NO sentinel.
  console.error(`doc-consistency: internal error — ${error.message}`);
  process.exit(1);
}
