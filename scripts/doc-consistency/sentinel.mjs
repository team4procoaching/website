/**
 * Doc-consistency stdout sentinel — the byte-exact stdout contract, isolated as
 * pure logic with no I/O.
 *
 * On every non-error run the runner's stdout ends with a single sentinel line:
 *
 *     Doc-consistency findings: <N>
 *
 * where <N> is the non-negative finding count (0 on a clean run). The literal
 * prefix `Doc-consistency findings: ` is FIXED and is the sole token any
 * consumer (the CI step, the tests) keys on. A one-byte divergence blinds the CI
 * discriminator — do not edit either side without the other. Pinned in ADR-0060
 * and docs/CONVENTIONS.md § Canonical-Pointer-Note Contract.
 *
 * Living in its own side-effect-free module (no top-level await, no
 * process.exit, no I/O) lets the byte-exact prefix be unit-tested without
 * importing the runner, whose top-level process.exit would kill the test worker.
 *
 * Imported by:
 * - scripts/check-doc-consistency.mjs (CLI runner)
 * - scripts/doc-consistency/sentinel.test.mjs (unit tests)
 */

/** The fixed sentinel prefix consumers key on. Pinned in ADR-0060 and
 *  docs/CONVENTIONS.md § Canonical-Pointer-Note Contract. A one-byte divergence
 *  blinds the CI discriminator — do not edit either side without the other. */
export const SENTINEL_PREFIX = 'Doc-consistency findings: ';

/**
 * Builds the final sentinel line for a given finding count.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatSentinel(count) {
  return `${SENTINEL_PREFIX}${count}`;
}
