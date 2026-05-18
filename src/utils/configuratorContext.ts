/**
 * Configurator URL-parameter parser and derivations for the contact-form
 * deep-link entry point.
 *
 * The configurator (separately landing on the service detail page)
 * emits a URL of the shape `/contact?service=<id>&duration=<N>min&package=<N>`
 * that pre-fills the contact form with the visitor's selected package. This
 * module owns the parser that gates the Configurator branch in
 * `ContactForm.astro`'s init script: it validates every parameter against
 * the canonical {@link Service} catalog, returning a typed
 * {@link ConfiguratorParams} on success or `null` on any validation failure
 * (graceful-degradation contract — the form-init script falls through to
 * the existing quiz / `?service=` prefill branches).
 *
 * Service-ID validation uses the {@link SessionService} discriminator
 * (`pricingModel === 'session'`) rather than the literal `'posing'` string.
 * A future second SessionService becomes a valid Configurator target with
 * zero parser changes — see ADR-0047 for the subscription/session split.
 *
 * Locale choice for {@link formatTotalPrice}: `Intl.NumberFormat` is invoked
 * with locale `'en-US'` because the existing price-string convention in
 * `services.ts` is comma-thousand-separator with a `€` prefix (`'€149'`,
 * `'€1,599'`). `de-DE` would format the same amount as `'1.149 €'`;
 * `en-GB` happens to behave like `en-US` for EUR but is inconsistent with
 * `BaseLayout`'s `locale='en'`. Do not change without auditing all call
 * sites and updating the locale-regression test in
 * `configuratorContext.test.ts`.
 */
import {
  getServiceById,
  isDurationMinutes,
  isPackageSize,
  type ServiceId,
  type SessionService,
  serviceDetailHref,
  serviceIds,
} from '~/data/services';

/**
 * Parsed Configurator URL parameters. Every field is constrained to a value
 * known to the {@link SessionService} catalog; an instance of this type is
 * the parser's success contract.
 */
type ConfiguratorParams = {
  /** SessionService identifier — narrowed to a known {@link ServiceId}. */
  service: ServiceId;
  /** Per-session duration in minutes; an entry of `service.configuration.durations`. */
  duration: number;
  /** Session count; an entry of `service.configuration.sessionCounts`. */
  package: number;
};

/**
 * Type guard: is `value` one of the literal IDs in {@link serviceIds}?
 * Narrows from `string` to {@link ServiceId} so `getServiceById(value)` is
 * a typed lookup rather than a cast.
 */
function isKnownServiceId(value: string): value is ServiceId {
  return (serviceIds as readonly string[]).includes(value);
}

/**
 * Type guard: is `service` a {@link SessionService}? Discriminated on
 * `pricingModel` per ADR-0047 so callers can read `configuration` without
 * an optional-chain dance.
 */
function isSessionService(service: ReturnType<typeof getServiceById>): service is SessionService {
  return service.pricingModel === 'session';
}

/**
 * Parse a `?duration=<N>min` value to its numeric minutes.
 * Returns `null` if the input does not match the strict `<digits>min`
 * shape (rejects `'60'`, `'60mins'`, `'sixty min'`, negative, decimal,
 * zero, leading-zero, etc.).
 */
function parseDurationParam(raw: string): number | null {
  const match = /^([1-9]\d*)min$/.exec(raw);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Parse a `?package=<N>` value to its numeric session count.
 * Returns `null` if the input is not a strictly positive integer (rejects
 * `'5.0'`, `'-5'`, `'0'`, `'05'`, `'5x'`, etc.).
 */
function parsePackageParam(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Parse Configurator URL parameters into a {@link ConfiguratorParams}.
 * Returns `null` on any validation failure — missing parameters, unknown
 * service ID, non-{@link SessionService} target, or values outside the
 * service's configuration matrix. Never throws; the form-init script
 * relies on this contract to fall through to the quiz / `?service=`
 * prefill branches when the parse fails.
 */
function parseConfiguratorParams(params: URLSearchParams): ConfiguratorParams | null {
  const serviceRaw = params.get('service');
  const durationRaw = params.get('duration');
  const packageRaw = params.get('package');
  if (serviceRaw === null || durationRaw === null || packageRaw === null) return null;

  if (!isKnownServiceId(serviceRaw)) return null;
  const service = getServiceById(serviceRaw);
  if (!isSessionService(service)) return null;

  const duration = parseDurationParam(durationRaw);
  if (duration === null || !isDurationMinutes(duration)) return null;
  if (!service.configuration.durations.includes(duration)) return null;

  const sessionCount = parsePackageParam(packageRaw);
  if (sessionCount === null || !isPackageSize(sessionCount)) return null;
  if (!service.configuration.sessionCounts.includes(sessionCount)) return null;

  return { service: serviceRaw, duration, package: sessionCount };
}

/**
 * Human-readable configuration line for the Configurator context box, e.g.
 * `"5 sessions · 60 minutes each"` or `"1 session · 30 minutes each"`.
 * Pluralisation is on the session count only — `"60 minutes each"` reads
 * naturally for any positive integer.
 */
function formatConfigurationLine(params: ConfiguratorParams): string {
  const sessionWord = params.package === 1 ? 'session' : 'sessions';
  return `${params.package} ${sessionWord} · ${params.duration} minutes each`;
}

const totalPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * Total price string for the Configurator context box, e.g. `"€1,149"`.
 * Derived as `service.pricing[0].amount × package`; the
 * {@link SessionService} pricing tuple is single-entry by ADR-0047 so
 * `pricing[0]` is the canonical per-session anchor.
 *
 * See the file-level JSDoc for the `'en-US'` locale rationale.
 */
function formatTotalPrice(params: ConfiguratorParams): string {
  const service = getServiceById(params.service);
  if (!isSessionService(service)) {
    // Unreachable at runtime when params come from parseConfiguratorParams
    // (which already narrows to SessionService), but the explicit guard
    // keeps formatTotalPrice defensible if a caller hand-builds the params.
    throw new Error(
      `formatTotalPrice received params for non-SessionService '${params.service}'. The parser narrows to SessionService; bypassing it is a contract violation.`,
    );
  }
  const total = service.pricing[0].amount * params.package;
  return totalPriceFormatter.format(total);
}

/**
 * Back-link URL for the "Change selection ↗" affordance — the visitor's
 * original service detail page with the Configurator parameters preserved
 * so the configurator opens on the same selection (round-trip enabled).
 *
 * Routes through {@link serviceDetailHref} (which itself reads
 * `routes.services`) so a future change to the detail-route shape
 * propagates without touching this builder.
 */
function buildChangeSelectionHref(params: ConfiguratorParams): string {
  const search = new URLSearchParams({
    service: params.service,
    duration: `${params.duration}min`,
    package: String(params.package),
  });
  return `${serviceDetailHref(params.service)}?${search.toString()}`;
}

export {
  buildChangeSelectionHref,
  formatConfigurationLine,
  formatTotalPrice,
  parseConfiguratorParams,
};
export type { ConfiguratorParams };
