/**
 * Query planning: which cht-datasource call satisfies a FHIR request.
 *
 * Every plan is a cht-datasource call. The facade queries no view directly,
 * which keeps it on the supported data API rather than on cht-core's internal
 * indexes — those move, and a facade pinned to them breaks quietly when they do.
 *
 * A plan is a description, never a call: this module performs no I/O.
 * `api/src/services/fhir.js` holds the implementations, keyed by `op`.
 */
import { type FacadeResourceType, bindingServesType } from './catalog';
import { type FacadeConfig, sourceMatchKey } from './config';

export type QueryPlan =
  | { readonly kind: 'read'; readonly op: 'person' | 'report'; readonly uuid: string }
  /** `Person.v1.getPage(byContactType)`. */
  | {
    readonly kind: 'person-by-type';
    readonly contactType: string;
    readonly cursor: string | null;
    readonly limit: number;
  }
  /**
   * `getUuidsPage(<qualifier>)` then `getPage(byIds)`: `getPage` on Contact
   * and Report takes an ids qualifier and nothing else. The id page is the
   * page, and its cursor is the searchset's `next`.
   */
  | {
    readonly kind: 'contact-by-type-freetext';
    readonly contactType: string;
    readonly freetext: string;
    readonly cursor: string | null;
    readonly limit: number;
  }
  | {
    readonly kind: 'report-by-forms';
    readonly forms: readonly string[];
    readonly cursor: string | null;
    readonly limit: number;
  };

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

/** The shortest freetext cht-datasource will accept. */
const MIN_FREETEXT_LENGTH = 3;

/** A FHIR reference may arrive as `Encounter/abc`, as a full url, or bare. */
const referenceValue = (value: string): string => value.slice(value.lastIndexOf('/') + 1);

export interface PlanRequest {
  /** Already validated against the resource type's search parameters. */
  readonly params: Readonly<Record<string, string>>;
  readonly cursor: string | null;
  readonly limit: number;
}

export type PlanResult =
  | { readonly ok: true; readonly plan: QueryPlan }
  | { readonly ok: false; readonly message: string };

/** Patient is always a person, and Encounter and Observation are both reports. */
export const planRead = (resourceType: FacadeResourceType, uuid: string): QueryPlan => {
  return { kind: 'read', op: resourceType === 'Patient' ? 'person' : 'report', uuid };
};

/**
 * Plan a search. `_id` is handled by the caller as a read, because a
 * one-entry searchset needs the same fetch as a read.
 */
export const planSearch = (
  config: FacadeConfig,
  resourceType: FacadeResourceType,
  request: PlanRequest,
): PlanResult => {
  const { params, cursor, limit } = request;
  const bindings = config.bindings.filter(binding => bindingServesType(binding, resourceType));

  if (resourceType === 'Patient') {
    // `loadConfig` serves at most one Patient binding.
    const contactType = bindings[0].sourceId;
    if (params.name === undefined) {
      return { ok: true, plan: { kind: 'person-by-type', contactType, cursor, limit } };
    }
    const freetext = params.name.trim();
    if (freetext.length < MIN_FREETEXT_LENGTH) {
      return { ok: false, message: `The name search parameter needs at least ${MIN_FREETEXT_LENGTH} characters.` };
    }
    return { ok: true, plan: { kind: 'contact-by-type-freetext', contactType, freetext, cursor, limit } };
  }

  if (params.encounter !== undefined) {
    return { ok: true, plan: planRead('Encounter', referenceValue(params.encounter)) };
  }
  // One query over every bound form; `bindingMatchesDoc` sorts the results back out.
  return { ok: true, plan: { kind: 'report-by-forms', forms: bindings.map(sourceMatchKey), cursor, limit } };
};
