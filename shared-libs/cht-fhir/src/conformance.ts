/**
 * The FHIR resources the facade emits that are not mapped from a CHT
 * document: the CapabilityStatement, and the Bundle and OperationOutcome
 * envelopes.
 *
 * The CapabilityStatement is *derived*: which resource types are bound decides
 * `rest.resource[]`, and the catalog decides `searchParam[]`, so it cannot
 * drift from the code that answers the requests.
 *
 * Pure, and clock-free: `now` is always passed in.
 */
import { FACADE_RESOURCE_TYPES, RESOURCE_TYPES, bindingServesType } from './catalog';
import type { FacadeConfig } from './config';

export const FHIR_VERSION = '4.0.1';
export const FHIR_JSON_CONTENT_TYPE = 'application/fhir+json';

const RESTFUL_SECURITY_SERVICE = 'http://terminology.hl7.org/CodeSystem/restful-security-service';

/**
 * `code` values are from the FHIR issue-type value set. The mapping used by
 * the facade: 400 → `invalid`, 401 → `login`, 403 → `forbidden`,
 * 404 → `not-found`, 503 → `transient`, else `exception`.
 */
export const operationOutcome = (code: string, diagnostics: string): Record<string, unknown> => ({
  resourceType: 'OperationOutcome',
  issue: [{ severity: 'error', code, diagnostics }],
});

export interface BundleLink {
  readonly relation: 'self' | 'next';
  readonly url: string;
}

/**
 * A searchset Bundle.
 *
 * `total` is omitted unless the caller genuinely knows it. CouchDB view
 * pagination does not hand back a matched count, and a `total` equal to the
 * page size is a lie a client will act on.
 */
export const searchsetBundle = (
  resources: readonly Record<string, unknown>[],
  serviceBase: string,
  links: readonly BundleLink[],
  total?: number,
): Record<string, unknown> => ({
  resourceType: 'Bundle',
  type: 'searchset',
  ...(total === undefined ? {} : { total }),
  link: links.map(link => ({ ...link })),
  entry: resources.map(resource => ({
    fullUrl: `${serviceBase}/${resource.resourceType}/${resource.id}`,
    resource,
    search: { mode: 'match' },
  })),
});

export interface CapabilityStatementOptions {
  readonly config: FacadeConfig;
  /** The facade's own base URL, e.g. `https://host/api/v1/fhir`. */
  readonly serviceBase: string;
  readonly now: string;
  readonly softwareVersion?: string;
}

export const buildCapabilityStatement = (options: CapabilityStatementOptions): Record<string, unknown> => {
  const { config, serviceBase, now, softwareVersion } = options;
  const types = FACADE_RESOURCE_TYPES
    .filter(type => config.bindings.some(binding => bindingServesType(binding, type)));

  return {
    resourceType: 'CapabilityStatement',
    id: 'cht-facade',
    url: `${config.canonicalBase.replace(/\/+$/, '')}/CapabilityStatement/cht-facade`,
    name: 'ChtFacadeCapabilityStatement',
    title: 'CHT FHIR Facade',
    status: 'active',
    date: now,
    kind: 'instance',
    software: softwareVersion ? { name: 'CHT Core', version: softwareVersion } : { name: 'CHT Core' },
    implementation: { description: 'CHT FHIR Facade', url: serviceBase },
    fhirVersion: FHIR_VERSION,
    format: [FHIR_JSON_CONTENT_TYPE],
    rest: [{
      mode: 'server',
      documentation: 'Read-only FHIR facade over CHT documents, generated from the deployment\'s FHIR mapping. '
        + 'Pagination is cursor-based: follow Bundle.link[relation=next] verbatim.',
      security: {
        cors: false,
        service: [{
          coding: [{ system: RESTFUL_SECURITY_SERVICE, code: 'Basic', display: 'Basic' }],
        }],
        description: 'CHT session cookie or HTTP basic auth. Requires an online user with the '
          + 'can_access_fhir_api permission.',
      },
      resource: types.map(type => ({
        type,
        interaction: [{ code: 'read' }, { code: 'search-type' }],
        searchParam: RESOURCE_TYPES[type].searchParams.map(spec => ({ ...spec })),
      })),
    }],
  };
};
