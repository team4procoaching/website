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
 * Price source for {@link formatTotalPrice}: the displayed total is read
 * verbatim from the matching {@link SessionPackage}'s pre-formatted `price`
 * string in `service.packages[]`, keyed on `(duration, sessionCount)` —
 * the same per-card source the detail-page configurator uses. The function
 * does no arithmetic and no locale formatting; the discounted matrix is the
 * single source of truth (`sessionPricing.ts` documents the same contract
 * for the detail-page `PackageCard`). A linear `pricing[0].amount × package`
 * computation would drift from the enumerated volume discounts — that drift
 * was a shipped bug this module no longer reproduces.
 */
import {
  getServiceById,
  isDurationMinutes,
  isPackageSize,
  type ServiceId,
  type SessionPackage,
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
 *
 * Exact match — case-sensitive, no trimming. Callers that read URL
 * parameters or sessionStorage payloads should pass the raw value: the
 * type guard's job is to admit only canonical IDs, and any normalisation
 * is the caller's responsibility (typically: reject, do not coerce).
 * The contact-form thanks-page reader uses this guard directly to
 * validate the `service` field of a sessionStorage carry payload.
 */
function isKnownServiceId(value: string): value is ServiceId {
  return (serviceIds as readonly string[]).includes(value);
}

/**
 * Parse a `?service=<id>` URL parameter into a {@link ServiceId}.
 * Returns `null` when the parameter is missing, empty, contains
 * whitespace, uses a non-canonical case, names the "not sure yet"
 * dropdown value, or otherwise fails {@link isKnownServiceId}.
 *
 * Consumed by the contact-form controller's subscription strong-intent arm:
 * it extracts the concrete service id from a bare `?service=<id>` landing,
 * which the controller then gates on `pricingModel === 'subscription'` to
 * decide whether to show the subscription prefill treatment (locked line +
 * program headline + subscription box). It is the service-field parser
 * parallel to {@link parseConfiguratorParams}'s richer triple — the
 * single-field counterpart for landings that carry only a service id.
 */
function parseServiceIdParam(params: URLSearchParams): ServiceId | null {
  const raw = params.get('service');
  if (raw === null) return null;
  if (!isKnownServiceId(raw)) return null;
  return raw;
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

/**
 * Look up the {@link SessionPackage} matching a `(duration, sessionCount)`
 * pair in a service's `packages[]` matrix. Returns `null` when the service
 * carries no `packages` array (a {@link SessionService} can be a valid
 * configuration target — `configuration` present — yet omit the optional
 * detail-page `packages`) or when no cell matches the requested combination.
 *
 * `packages[]` is the discounted price matrix; the per-cell `price` string
 * is the canonical display value (e.g. `'€1,149'`), so callers read it
 * verbatim rather than computing a total.
 */
function findSessionPackage(
  service: SessionService,
  duration: number,
  sessionCount: number,
): SessionPackage | null {
  return (
    service.packages?.find(
      (pkg) => pkg.duration === duration && pkg.sessionCount === sessionCount,
    ) ?? null
  );
}

/**
 * Total price string for the Configurator context box, e.g. `"€1,149"`.
 * Read verbatim from the matching {@link SessionPackage}'s pre-formatted
 * `price` in `service.packages[]`, keyed on the configuration's
 * `(duration, package)` pair — the discounted matrix is the single source
 * of truth (see the file-level JSDoc).
 *
 * Returns `null` when no matching package exists (the service omits the
 * optional `packages` array, or carries it without the requested cell).
 * Callers leave the price line blank on `null` — graceful degradation, never
 * a thrown error or a wrong number. Today Posing carries all six cells, so
 * this null path is latent; it sets the contract for a future SessionService
 * that ships `configuration` without `packages`.
 */
function formatTotalPrice(params: ConfiguratorParams): string | null {
  const service = getServiceById(params.service);
  if (!isSessionService(service)) {
    // Unreachable at runtime when params come from parseConfiguratorParams
    // (which already narrows to SessionService), but the explicit guard
    // keeps formatTotalPrice defensible if a caller hand-builds the params.
    throw new Error(
      `formatTotalPrice received params for non-SessionService '${params.service}'. The parser narrows to SessionService; bypassing it is a contract violation.`,
    );
  }
  return findSessionPackage(service, params.duration, params.package)?.price ?? null;
}

/**
 * Back-link URL for the "Change package ↗" affordance — the visitor's
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
  isKnownServiceId,
  parseConfiguratorParams,
  parseServiceIdParam,
};
export type { ConfiguratorParams };
