/**
 * CLI runner for convention checks that Biome cannot enforce.
 *
 * Walks src/, reads files, delegates to pure check functions in
 * ./conventions/checks.mjs, and reports results.
 *
 * Exit code 0 = all checks pass, 1 = violations found.
 * Runs on Windows, macOS, and Linux (Node.js only, no shell dependencies).
 *
 * Usage:
 *   node scripts/check-conventions.mjs
 *   pnpm check:conventions
 *
 * Test files (.test.ts, .spec.ts) are excluded from content checks
 * (parseInt, interface) because test code legitimately uses patterns that
 * production code should not (e.g., testing error paths with parseInt).
 * File naming is checked for ALL .ts files including tests — naming
 * consistency applies regardless of file purpose.
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import { checkFileNaming, checkNoInterface, checkNoParseInt } from './conventions/checks.mjs';

const SRC_DIR = 'src';

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/** Recursively collect files matching a predicate. Results are sorted for
 *  deterministic output across platforms and filesystems. */
async function walk(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(full, predicate)));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results.sort();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  const violations = [];

  const tsFiles = await walk(SRC_DIR, (name) => {
    return name.endsWith('.ts') && !name.endsWith('.d.ts');
  });

  const nonTestFiles = tsFiles.filter((f) => !f.includes('.test.') && !f.includes('.spec.'));

  // Read each non-test file once, run all content checks in a single pass
  for (const file of nonTestFiles) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    checkNoParseInt(file, lines, violations);
    checkNoInterface(file, lines, violations);
  }

  // File naming applies to all .ts files including tests
  for (const file of tsFiles) {
    const name = basename(file, extname(file));
    checkFileNaming(file, name, violations);
  }

  // Sort for deterministic CI output: file → line → rule
  violations.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule),
  );

  if (violations.length === 0) {
    console.log('✓ All convention checks passed');
    process.exit(0);
  } else {
    console.error(`✗ ${violations.length} convention violation(s) found:\n`);
    for (const v of violations) {
      const loc = v.line > 0 ? `:${v.line}` : '';
      console.error(`  ${v.file}${loc}`);
      console.error(`    [${v.rule}] ${v.message}`);
      if (v.content) {
        console.error(`    > ${v.content}`);
      }
      console.error('');
    }
    process.exit(1);
  }
} catch (error) {
  console.error(`Failed to run convention checks: ${error.message}`);
  process.exit(1);
}
