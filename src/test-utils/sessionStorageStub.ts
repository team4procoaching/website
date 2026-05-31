/**
 * Shared `sessionStorage` stub for jsdom-environment tests.
 *
 * jsdom ships a `sessionStorage`, but stubbing the global with a plain
 * `Map`-backed object lets a test assert on the underlying store directly
 * and avoids cross-test bleed. Three controller test files
 * (`contactFormController`, `quizModalController`, `thanksSelectionReader`)
 * previously each declared the same `Map` + `beforeEach(vi.stubGlobal(...))`
 * block; this helper is the single grep-visible surface for that stub
 * (`rg "from '~/test-utils/sessionStorageStub'"`).
 *
 * The helper registers its own `beforeEach` (clear the store + install the
 * stub) and returns the backing `Map`, so a test can seed entries before the
 * code under test runs and assert on them afterwards. Cleanup of the stub is
 * each file's own `afterEach` via `vi.restoreAllMocks()` — that hook is kept
 * local because the three consumers pair it with file-specific teardown
 * (`document.body.innerHTML = ''`, `history.replaceState(...)`).
 *
 * The stub implements only the three members every consumer uses —
 * `getItem`, `setItem`, `removeItem`. No consumer reads `clear`, `key`, or
 * `length`; adding them would be dead surface.
 *
 * @example
 * ```typescript
 * const mockStorage = installSessionStorageStub();
 * // inside a test:
 * mockStorage.set('key', 'value'); // seed
 * runCodeUnderTest();
 * expect(sessionStorage.getItem('key')).toBeNull(); // assert
 * ```
 */
import { beforeEach, vi } from 'vitest';

/**
 * Install a `Map`-backed `sessionStorage` stub via a self-registered
 * `beforeEach` and return the backing `Map`. The `beforeEach` clears the
 * `Map` and re-installs the stub before every test, so the returned `Map`
 * is empty at the start of each test and stays addressable for seeding and
 * assertions throughout it.
 *
 * Call once at module scope in a test file; pair with a file-local
 * `afterEach(() => vi.restoreAllMocks())` to remove the global stub.
 */
function installSessionStorageStub(): Map<string, string> {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    });
  });

  return mockStorage;
}

export { installSessionStorageStub };
