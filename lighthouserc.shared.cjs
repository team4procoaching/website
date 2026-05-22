/**
 * Shared Lighthouse CI resource-transfer budgets.
 *
 * The four resource-transfer assertions (total / script / image / font) apply
 * to both form factors at identical thresholds. They are defined here once and
 * `require()`d by `lighthouserc.cjs` (Mobile) and `lighthouserc.desktop.cjs`
 * (Desktop), which spread `resourceBudgetAssertions` into their own
 * `assert.assertions`. The two form-factor `autorun` invocations therefore
 * evaluate the same four thresholds against the mobile and the desktop LHRs
 * respectively.
 *
 * Each threshold is keyed off the worst-of-both-form-factors baseline measured
 * against `main@08f317b` (Lighthouse 12.6.1): total 373 KB (mobile `/`),
 * script 125 KB (form-factor-identical), image 15 KB (desktop
 * `/success-stories/`), font 51 KB (form-factor-identical). `script` and `font`
 * transfers are form-factor-identical; `image` and `total` differ because
 * responsive `srcset` serves larger image candidates at the desktop viewport,
 * so the desktop figure is the worst-of-both for those two.
 *
 * `resource-summary:<type>:size` asserts against the resource's `transferSize`;
 * `maxNumericValue` is expressed in bytes (KB * 1024). All four ship WARN-mode
 * for day one — see ADR-0053 for the WARN->ERROR transition.
 *
 * These four budgets are part of the explicit-only Lighthouse gate: the gate
 * carries no `preset`, and these are 4 of its named assertions (4 category
 * scores + 4 Core Web Vitals + these 4 resource budgets). The full set is 12
 * on Mobile; Desktop asserts 11 because `cumulative-layout-shift` is deferred
 * there until the desktop-CLS follow-up lands (see ADR-0053).
 */

const KB = 1024;

/** @type {Record<string, [string, { maxNumericValue: number }]>} */
const resourceBudgetAssertions = {
  // Total transfer — worst-of-both baseline 373 KB; day-one budget 600 KB.
  'resource-summary:total:size': ['warn', { maxNumericValue: 600 * KB }],
  // Script transfer — form-factor-identical baseline 125 KB; day-one 150 KB.
  'resource-summary:script:size': ['warn', { maxNumericValue: 150 * KB }],
  // Image transfer — worst-of-both baseline 15 KB; day-one budget 400 KB.
  'resource-summary:image:size': ['warn', { maxNumericValue: 400 * KB }],
  // Font transfer — form-factor-identical baseline 51 KB; day-one 100 KB.
  'resource-summary:font:size': ['warn', { maxNumericValue: 100 * KB }],
};

module.exports = { resourceBudgetAssertions };
