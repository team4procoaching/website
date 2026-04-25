/**
 * Text-selection rule for a `ProcessSteps` step paragraph.
 *
 * The compact variant prefers the one-sentence `shortDescription` tagline;
 * the default variant always renders the long-form `description`. A missing
 * or empty `shortDescription` is treated as "absent" — the compact variant
 * falls back to `description`, matching the "non-empty string" contract
 * documented on the data type.
 *
 * Extracted from `ProcessSteps.astro` so the selection rule can be covered
 * by a pure-function Vitest test independently of the rendering context
 * (pure-function layer per ADR-0037).
 */
import type { ProcessStep } from '~/data/howItWorks';

type StepSize = 'default' | 'compact';

function pickStepText(
  step: Pick<ProcessStep, 'description' | 'shortDescription'>,
  size: StepSize,
): string {
  return size === 'compact' && step.shortDescription ? step.shortDescription : step.description;
}

export { pickStepText };
export type { StepSize };
