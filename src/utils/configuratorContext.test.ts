import { describe, expect, it } from 'vitest';
import {
  buildChangeSelectionHref,
  type ConfiguratorParams,
  formatConfigurationLine,
  formatTotalPrice,
  parseConfiguratorParams,
} from './configuratorContext';

const buildParams = (entries: Record<string, string>): URLSearchParams =>
  new URLSearchParams(entries);

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
  it('formats €149 × 5 = €745 with the en-US currency convention', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 5 };
    expect(formatTotalPrice(params)).toBe('€745');
  });

  it('formats €149 × 10 = €1,490 with a comma thousand-separator', () => {
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 10 };
    expect(formatTotalPrice(params)).toBe('€1,490');
  });

  it('does not produce a de-DE-style "1.490 €" output (locale-regression guard)', () => {
    // If a future contributor "fixes" the locale to 'de-DE', this assertion
    // catches it. See file-level JSDoc for the en-US rationale.
    const params: ConfiguratorParams = { service: 'posing', duration: 60, package: 10 };
    const formatted = formatTotalPrice(params);
    expect(formatted).not.toBe('1.490 €');
    expect(formatted.startsWith('€')).toBe(true);
    expect(formatted).toContain(',');
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
