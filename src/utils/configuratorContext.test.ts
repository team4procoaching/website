import { describe, expect, it } from 'vitest';
import { getServiceById, type SessionService, serviceIds } from '~/data/services';
import {
  buildChangeSelectionHref,
  type ConfiguratorParams,
  formatConfigurationLine,
  formatTotalPrice,
  isKnownServiceId,
  parseConfiguratorParams,
  parseServiceIdParam,
} from './configuratorContext';

const buildParams = (entries: Record<string, string>): URLSearchParams =>
  new URLSearchParams(entries);

/**
 * Narrow a service to the {@link SessionService} arm with a present
 * `packages[]` matrix for the matrix-source assertions. Throws (rather than
 * silently skipping) if the catalog ever drops posing's packages, so the
 * source-of-truth guard cannot pass vacuously.
 */
function assertHasPackages(
  service: ReturnType<typeof getServiceById>,
): asserts service is SessionService & { packages: NonNullable<SessionService['packages']> } {
  if (service.pricingModel !== 'session' || service.packages === undefined) {
    throw new Error(`expected a SessionService with a packages[] matrix, got '${service.id}'`);
  }
}

describe('parseConfiguratorParams — happy path', () => {
  it('returns the typed object for the canonical posing URL', () => {
    const result = parseConfiguratorParams(
      buildParams({ service: 'posing', duration: '60min', package: '5' }),
    );
    expect(result).toEqual({ service: 'posing', duration: 60, package: 5 });
  });

  it('parses every valid sessionCounts × durations combination for posing', () => {
    // posing: sessionCounts = [1, 5, 10], durations = [30, 60]
    const sessionCounts = [1, 5, 10];
    const durations = [30, 60];
    for (const sessionCount of sessionCounts) {
      for (const duration of durations) {
        const result = parseConfiguratorParams(
          buildParams({
            service: 'posing',
            duration: `${duration}min`,
            package: String(sessionCount),
          }),
        );
        expect(result).toEqual({ service: 'posing', duration, package: sessionCount });
      }
    }
  });
});

describe('parseConfiguratorParams — null returns', () => {
  it('returns null when service is missing', () => {
    expect(parseConfiguratorParams(buildParams({ duration: '60min', package: '5' }))).toBeNull();
  });

  it('returns null when duration is missing', () => {
    expect(parseConfiguratorParams(buildParams({ service: 'posing', package: '5' }))).toBeNull();
  });

  it('returns null when package is missing', () => {
    expect(
      parseConfiguratorParams(buildParams({ service: 'posing', duration: '60min' })),
    ).toBeNull();
  });

  it('returns null for an unknown service ID', () => {
    expect(
      parseConfiguratorParams(
        buildParams({ service: 'made-up-service', duration: '60min', package: '5' }),
      ),
    ).toBeNull();
  });

  it('returns null for a non-SessionService (subscription pricing model)', () => {
    // competition-prep is pricingModel: 'subscription' — must be rejected.
    expect(
      parseConfiguratorParams(
        buildParams({ service: 'competition-prep', duration: '60min', package: '5' }),
      ),
    ).toBeNull();
  });

  it('returns null for a duration not in the service configuration matrix', () => {
    // posing.configuration.durations = [30, 60]; 45min must be rejected.
    expect(
      parseConfiguratorParams(buildParams({ service: 'posing', duration: '45min', package: '5' })),
    ).toBeNull();
  });

  it('returns null for a package not in the service configuration matrix', () => {
    // posing.configuration.sessionCounts = [1, 5, 10]; 7 must be rejected.
    expect(
      parseConfiguratorParams(buildParams({ service: 'posing', duration: '60min', package: '7' })),
    ).toBeNull();
  });

  it('returns null for a malformed duration without the "min" suffix', () => {
    expect(
      parseConfiguratorParams(buildParams({ service: 'posing', duration: '60', package: '5' })),
    ).toBeNull();
  });

  it('returns null for a non-numeric package', () => {
    expect(
      parseConfiguratorParams(
        buildParams({ service: 'posing', duration: '60min', package: 'five' }),
      ),
    ).toBeNull();
  });

  it('returns null for a negative package', () => {
    expect(
      parseConfiguratorParams(buildParams({ service: 'posing', duration: '60min', package: '-5' })),
    ).toBeNull();
  });

  it('returns null for a decimal package', () => {
    expect(
      parseConfiguratorParams(
        buildParams({ service: 'posing', duration: '60min', package: '5.0' }),
      ),
    ).toBeNull();
  });
});

describe('formatConfigurationLine', () => {
  it('uses plural "sessions" for a 5-session package', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 5 };
    expect(formatConfigurationLine(params)).toBe('5 sessions · 60 minutes each');
  });

  it('uses singular "session" for a 1-session package', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 30, package: 1 };
    expect(formatConfigurationLine(params)).toBe('1 session · 30 minutes each');
  });

  it('renders 10-session × 60-minute as the canonical anchor combo', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 10 };
    expect(formatConfigurationLine(params)).toBe('10 sessions · 60 minutes each');
  });
});

describe('formatTotalPrice', () => {
  it('returns the discounted matrix price for the 60min × 5-session package', () => {
    // posing.packages[(60, 5)].price === '€1,149' — NOT the linear
    // 149 × 5 = '€745'. The bug this replaces computed the linear value and
    // shipped it green because the prior assertion encoded '€745'.
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 5 };
    expect(formatTotalPrice(params)).toBe('€1,149');
  });

  it('returns the discounted matrix price for the 60min × 10-session package', () => {
    // posing.packages[(60, 10)].price === '€2,149' — NOT the linear
    // 149 × 10 = '€1,490'.
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 10 };
    expect(formatTotalPrice(params)).toBe('€2,149');
  });

  it('returns the matrix price for every (duration, sessionCount) combo posing offers', () => {
    // Full-matrix guard: every cell of posing.packages[] is asserted against
    // the catalog's pre-formatted `price`, so a future formula-drift on any
    // single combination is caught, not just the two anchor cells above.
    const expected: ReadonlyArray<{ duration: 30 | 60; package: 1 | 5 | 10; price: string }> = [
      { duration: 30, package: 1, price: '€149' },
      { duration: 60, package: 1, price: '€249' },
      { duration: 30, package: 5, price: '€699' },
      { duration: 60, package: 5, price: '€1,149' },
      { duration: 30, package: 10, price: '€1,299' },
      { duration: 60, package: 10, price: '€2,149' },
    ];
    for (const { duration, package: sessionCount, price } of expected) {
      const params: ConfiguratorParams = { service: 'posing', duration, package: sessionCount };
      expect(formatTotalPrice(params)).toBe(price);
    }
  });

  it('reads the price verbatim from the catalog matrix, never re-deriving it', () => {
    // Source-of-truth guard: the returned string is byte-identical to the
    // matching posing.packages[] entry's `price`. Proves the display reads
    // the discounted matrix rather than recomputing a (possibly wrong) total.
    const posing = getServiceById('posing');
    assertHasPackages(posing);
    for (const pkg of posing.packages) {
      const params: ConfiguratorParams = {
        service: 'posing',
        duration: pkg.duration,
        package: pkg.sessionCount,
      };
      expect(formatTotalPrice(params)).toBe(pkg.price);
    }
  });

  it('returns null when no package cell matches the configuration', () => {
    // Graceful-degradation contract: a (duration, sessionCount) combo with
    // no matching packages[] entry yields `null`, so callers leave the price
    // line blank rather than throwing or showing a wrong number. No real
    // session service misses a cell today (posing carries all six), so this
    // synthetic combo — a duration/count posing does not offer — is the only
    // way to reach the null branch. `duration: 45` is a value the parser never
    // emits (posing offers 30/60), but `ConfiguratorParams.duration` is a plain
    // `number`, so the typed literal reaches the lookup miss without a cast.
    const params: ConfiguratorParams = { service: 'posing', duration: 45, package: 5 };
    expect(formatTotalPrice(params)).toBeNull();
  });
});

describe('buildChangeSelectionHref', () => {
  it('preserves all three parameters in the round-trip URL', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 5 };
    expect(buildChangeSelectionHref(params)).toBe(
      '/services/posing?service=posing&duration=60min&package=5',
    );
  });

  it('emits the duration with the "min" suffix the parser expects', () => {
    // Symmetry contract: the builder's output, when round-tripped through
    // parseConfiguratorParams, recovers the original ConfiguratorParams.
    const params: ConfiguratorParams = { service: 'posing', duration: 30, package: 10 };
    const href = buildChangeSelectionHref(params);
    const search = new URLSearchParams(href.split('?')[1] ?? '');
    expect(parseConfiguratorParams(search)).toEqual(params);
  });
});

describe('isKnownServiceId', () => {
  it('returns true for a canonical service ID', () => {
    expect(isKnownServiceId('posing')).toBe(true);
  });

  it('returns false for the "not sure yet" dropdown sentinel', () => {
    // Mirrors NOT_SURE_OPTION_VALUE in ContactForm.astro; the guard must
    // reject it so the form-init script falls through to the unselected
    // branch rather than treating the sentinel as a valid service.
    expect(isKnownServiceId('not-sure-yet')).toBe(false);
  });
});

describe('parseServiceIdParam — happy path', () => {
  it('returns the typed ServiceId for every entry in serviceIds', () => {
    for (const id of serviceIds) {
      expect(parseServiceIdParam(buildParams({ service: id }))).toBe(id);
    }
  });
});

describe('parseServiceIdParam — null returns', () => {
  it('returns null for an unknown service ID', () => {
    expect(parseServiceIdParam(buildParams({ service: 'made-up-service' }))).toBeNull();
  });

  it('returns null for the "not sure yet" dropdown sentinel', () => {
    expect(parseServiceIdParam(buildParams({ service: 'not-sure-yet' }))).toBeNull();
  });

  it('returns null for an empty service value', () => {
    expect(parseServiceIdParam(buildParams({ service: '' }))).toBeNull();
  });

  it('returns null for leading/trailing whitespace around a known ID', () => {
    // Strict match by design — callers reject rather than coerce.
    expect(parseServiceIdParam(buildParams({ service: ' posing ' }))).toBeNull();
  });

  it('returns null for a mixed-case canonical ID', () => {
    // ServiceIds are lower-case kebab; `POSING` is not a canonical entry.
    expect(parseServiceIdParam(buildParams({ service: 'POSING' }))).toBeNull();
  });

  it('returns null when the service param is missing entirely', () => {
    expect(parseServiceIdParam(buildParams({}))).toBeNull();
  });
});
