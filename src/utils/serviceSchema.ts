/**
 * Schema.org ItemList builder for the services catalog.
 *
 * Produces a JSON-LD-ready ItemList with nested Service items and
 * per-billing-period Offers, suitable for Google Rich Results and
 * generic structured-data consumers.
 *
 * The helper is intentionally pure: all external inputs (organization
 * name, list name, catalog URL, optional deep-link builder) flow in
 * via parameters, so it never couples to siteConfig, routes, or
 * Astro.site directly. Consumers own that wiring.
 *
 * @see https://schema.org/ItemList
 * @see https://schema.org/Service
 * @see https://schema.org/Offer
 */
import {
  type BillingPeriod,
  billingPeriods,
  type Service,
  type ServiceCategory,
} from '~/data/services';

/** Minimal schema.org Organization used as Service.provider. */
type ProviderSchema = {
  '@type': 'Organization';
  name: string;
};

/** A single Offer attached to a Service — one per billing period. */
type OfferSchema = {
  '@type': 'Offer';
  /** Human-readable label, sourced from billingPeriods[].label ("Monthly", "6 Months", "12 Months"). */
  name: string;
  /** Numeric price amount (integer EUR today). */
  price: number;
  /** ISO 4217 currency code. */
  priceCurrency: 'EUR';
  /** Stable period id used as disambiguator category ("monthly" | "six-months" | "twelve-months"). */
  category: BillingPeriod;
  /** Always InStock — coaching services have no capacity cap modelled today. */
  availability: 'https://schema.org/InStock';
};

/** The Service item nested inside a ListItem. */
type ServiceItemSchema = {
  '@type': 'Service';
  name: string;
  description: string;
  category: ServiceCategory;
  /** Absolute deep-link URL — set only when a buildServiceUrl callback is supplied. */
  url?: string;
  provider: ProviderSchema;
  offers: readonly OfferSchema[];
};

/** One entry in ItemList.itemListElement. */
type ListItemSchema = {
  '@type': 'ListItem';
  position: number;
  item: ServiceItemSchema;
};

/** Full Schema.org ItemList output. */
type ServiceListSchema = {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  name: string;
  url: string;
  itemListElement: readonly ListItemSchema[];
};

/** Options for {@link buildServiceListSchema}. */
type BuildServiceListSchemaOptions = {
  /** All services to list. Order is preserved in itemListElement. */
  services: readonly Service[];
  /** Display name written to ItemList.name (e.g. "Services", "Popular Programs"). */
  listName: string;
  /** Organization name used as Service.provider — typically siteConfig.name. */
  organizationName: string;
  /** Absolute URL of the services catalog page — written to ItemList.url. */
  listUrl: string;
  /**
   * Optional absolute-URL builder for Service.url.
   * When provided, each Service gains a `url` field containing the
   * deep-link produced by the callback. When omitted, Service.url is
   * left off entirely — consumers without a deep-link strategy get a
   * URL-less ItemList that is still schema-valid.
   */
  buildServiceUrl?: (service: Service) => string;
};

/**
 * Period-id → human label, derived once from billingPeriods at module load.
 * `Object.fromEntries` loses the tight Record typing, so we assert back —
 * safe because billingPeriods covers every BillingPeriod value by construction.
 */
const periodLabels: Record<BillingPeriod, string> = Object.fromEntries(
  billingPeriods.map((p) => [p.value, p.label]),
) as Record<BillingPeriod, string>;

/**
 * Build a Schema.org ItemList for the services catalog.
 *
 * @example
 * ```ts
 * const schema = buildServiceListSchema({
 *   services,
 *   listName: 'Services',
 *   organizationName: 'Team 4 Pro Coaching',
 *   listUrl: new URL('/services', Astro.site).toString(),
 *   buildServiceUrl: (s) => new URL(`/services?service=${s.id}`, Astro.site).toString(),
 * });
 * ```
 */
function buildServiceListSchema(options: BuildServiceListSchemaOptions): ServiceListSchema {
  const { services, listName, organizationName, listUrl, buildServiceUrl } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: service.name,
        description: service.description,
        category: service.category,
        ...(buildServiceUrl ? { url: buildServiceUrl(service) } : {}),
        provider: {
          '@type': 'Organization',
          name: organizationName,
        },
        offers: service.pricing.map((option) => ({
          '@type': 'Offer',
          name: periodLabels[option.period],
          price: option.amount,
          priceCurrency: option.currency,
          category: option.period,
          availability: 'https://schema.org/InStock',
        })),
      },
    })),
  };
}

// Export
export { buildServiceListSchema };
export type { BuildServiceListSchemaOptions, ServiceListSchema };
