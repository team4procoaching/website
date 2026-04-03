/**
 * Shared test assertion helpers.
 *
 * Use these instead of non-null assertions (`!`) in tests. They provide
 * type narrowing via `asserts` while failing fast with clear error messages
 * when the value is null or undefined.
 *
 * @example
 * ```typescript
 * const el = modal.querySelector<HTMLInputElement>('.my-input');
 * assertNotNull(el); // Throws if null, narrows type to HTMLInputElement
 * el.checked = true; // No lint warning, no `!` needed
 * ```
 */
import { expect } from 'vitest';

/**
 * Assert that a value is not null. Narrows the type for subsequent usage.
 * Fails the test immediately with a descriptive message if the value is null.
 */
function assertNotNull<T>(
  value: T | null,
  message = 'Expected value to not be null',
): asserts value is T {
  expect(value, message).not.toBeNull();
}

/**
 * Assert that a value is neither null nor undefined. Narrows the type for
 * subsequent usage. Useful for sessionStorage values, Map lookups, etc.
 */
function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
): asserts value is T {
  expect(value, message).toBeDefined();
  expect(value, message).not.toBeNull();
}

export { assertDefined, assertNotNull };
