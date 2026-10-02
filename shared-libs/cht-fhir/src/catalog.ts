/**
 * The element catalog: the resources this facade serves and the elements a
 * configuration may bind on each.
 *
 * The catalog is code, not configuration: a deployment binds CHT data to the
 * elements below and cannot add any. Patient, Encounter and Observation are the
 * whole of the first version, so the table is written out by hand and each row
 * carries its own `apply`.
 */
import type { ChtSourceKind } from './config';

export const FACADE_RESOURCE_TYPES = ['Patient', 'Encounter', 'Observation'] as const;
export type FacadeResourceType = typeof FACADE_RESOURCE_TYPES[number];

const CS_ACT_CODE = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';

/* --------------------------------- values --------------------------------- */

/** How a raw CHT value is turned into the element's FHIR datatype. */
export type Coercion = 'string' | 'date' | 'dateTime' | 'code' | 'reference' | 'concept';

export interface CodingValue {
  readonly system: string;
  readonly code: string;
  readonly display?: string;
}

/** A coerced value on its way into a resource. A `coding` source carries a whole concept. */
export type ElementValue = string | CodingValue;

/** A CodeableConcept from either shape a `concept` element may be given. */
const conceptOf = (value: ElementValue): Record<string, unknown> => {
  if (typeof value === 'string') {
    // No system to put it under, so `text` is all that can honestly be said.
    return { text: value };
  }
  const coding = value.display
    ? { system: value.system, code: value.code, display: value.display }
    : { system: value.system, code: value.code };
  return value.display
    ? { coding: [coding], text: value.display }
    : { coding: [coding] };
};

type ResourceDraft = Record<string, unknown>;

/* ------------------------------ write helpers ----------------------------- */

/** First element of an array-valued FHIR field, created if absent. */
const firstOf = (draft: ResourceDraft, key: string): Record<string, unknown> => {
  const existing = draft[key];
  if (Array.isArray(existing) && existing.length) {
    return existing[0] as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  draft[key] = [fresh];
  return fresh;
};

const appendTo = (draft: ResourceDraft, key: string, value: unknown): void => {
  const existing = draft[key];
  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }
  draft[key] = [value];
};

/** Object-valued FHIR field, created if absent — `period`, for instance. */
const objectAt = (draft: ResourceDraft, key: string): Record<string, unknown> => {
  const existing = draft[key];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as Record<string, unknown>;
  }
  const fresh: Record<string, unknown> = {};
  draft[key] = fresh;
  return fresh;
};

const referenceTo = (value: ElementValue) => ({ reference: String(value) });

const ACT_CODE_DISPLAYS: Readonly<Record<string, string>> = {
  AMB: 'ambulatory', EMER: 'emergency', FLD: 'field', HH: 'home health',
  IMP: 'inpatient encounter', OBSENC: 'observation encounter', PRENC: 'pre-admission',
  SS: 'short stay', VR: 'virtual',
};

/* ------------------------------- element rows ----------------------------- */

export interface ElementSpec {
  /** Binding key, e.g. `Patient.telecom.phone`. Not always a FHIR path. */
  readonly id: string;
  /** 1 when R4 requires the element, so a binding that leaves it unbound is refused. */
  readonly min: 0 | 1;
  /** Which source kinds this element accepts. */
  readonly accepts: readonly ChtSourceKind[];
  readonly coerce: Coercion;
  /** Closed code list, for a `required` binding. A value outside it is dropped. */
  readonly codes?: readonly string[];
  /** The resource type a `reference` row points at; the mapper prefixes the uuid with it. */
  readonly referenceType?: string;
  /** Writes the coerced value into the resource. */
  readonly apply: (draft: ResourceDraft, value: ElementValue) => void;
}

export interface SearchParamSpec {
  readonly name: string;
  readonly type: 'token' | 'string' | 'reference';
  readonly documentation: string;
}

export interface ResourceTypeSpec {
  /**
   * The CHT source a binding on this type must name, or null when the type is
   * projected rather than bound.
   */
  readonly sourceKind: 'contact_type' | 'form' | null;
  readonly elements: readonly ElementSpec[];
  readonly searchParams: readonly SearchParamSpec[];
}

const PATIENT: ResourceTypeSpec = {
  sourceKind: 'contact_type',
  searchParams: [
    { name: '_id', type: 'token', documentation: 'The CHT document uuid.' },
    { name: 'name', type: 'string', documentation: 'Free-text name search. Needs at least 3 characters.' },
  ],
  elements: [
    {
      id: 'Patient.name.text',
      min: 0,
      accepts: ['doc'],
      coerce: 'string',
      apply: (draft, value) => {
        firstOf(draft, 'name').text = value;
      },
    },
    {
      id: 'Patient.name.family',
      min: 0,
      accepts: ['doc'],
      coerce: 'string',
      // Merges into the HumanName `Patient.name.text` started.
      apply: (draft, value) => {
        firstOf(draft, 'name').family = value;
      },
    },
    {
      id: 'Patient.name.given',
      min: 0,
      accepts: ['doc'],
      coerce: 'string',
      apply: (draft, value) => {
        const name = firstOf(draft, 'name');
        name.given = [...(Array.isArray(name.given) ? name.given : []), value];
      },
    },
    {
      id: 'Patient.gender',
      min: 0,
      accepts: ['doc'],
      coerce: 'code',
      codes: ['male', 'female', 'other', 'unknown'],
      apply: (draft, value) => {
        draft.gender = value;
      },
    },
    {
      id: 'Patient.birthDate',
      min: 0,
      accepts: ['doc'],
      coerce: 'date',
      apply: (draft, value) => {
        draft.birthDate = value;
      },
    },
    {
      id: 'Patient.telecom.phone',
      min: 0,
      accepts: ['doc'],
      coerce: 'string',
      apply: (draft, value) => {
        appendTo(draft, 'telecom', { system: 'phone', value });
      },
    },
    {
      id: 'Patient.address.text',
      min: 0,
      accepts: ['doc', 'field'],
      coerce: 'string',
      apply: (draft, value) => {
        appendTo(draft, 'address', { text: value });
      },
    },
    {
      id: 'Patient.deceasedDateTime',
      min: 0,
      accepts: ['doc'],
      coerce: 'dateTime',
      apply: (draft, value) => {
        draft.deceasedDateTime = value;
      },
    },
    {
      // R4 types this Reference(Organization). This facade serves none, but the
      // CHT parent place is still an Organization.
      id: 'Patient.managingOrganization',
      min: 0,
      accepts: ['doc'],
      coerce: 'reference',
      referenceType: 'Organization',
      apply: (draft, value) => {
        draft.managingOrganization = referenceTo(value);
      },
    },
  ],
};

/**
 * A CHT report. `Encounter?date=` is deliberately absent from the search
 * parameters: no index covers form plus date together, so offering it would
 * mean scanning.
 */
const ENCOUNTER: ResourceTypeSpec = {
  sourceKind: 'form',
  searchParams: [
    { name: '_id', type: 'token', documentation: 'The CHT report uuid.' },
  ],
  elements: [
    {
      id: 'Encounter.status',
      min: 1,
      accepts: ['const'],
      coerce: 'code',
      codes: [
        'planned', 'arrived', 'triaged', 'in-progress', 'onleave',
        'finished', 'cancelled', 'entered-in-error', 'unknown',
      ],
      apply: (draft, value) => {
        draft.status = value;
      },
    },
    {
      // A Coding directly, not a CodeableConcept. Extensible, so an unlisted
      // code passes through rather than being dropped, which is why `coerce`
      // is `string` rather than `code`.
      id: 'Encounter.class',
      min: 1,
      accepts: ['const'],
      coerce: 'string',
      apply: (draft, value) => {
        const code = String(value);
        const display = ACT_CODE_DISPLAYS[code];
        draft.class = display ? { system: CS_ACT_CODE, code, display } : { system: CS_ACT_CODE, code };
      },
    },
    {
      id: 'Encounter.period.start',
      min: 0,
      accepts: ['doc', 'field'],
      coerce: 'dateTime',
      apply: (draft, value) => {
        objectAt(draft, 'period').start = value;
      },
    },
    {
      id: 'Encounter.period.end',
      min: 0,
      accepts: ['doc', 'field'],
      coerce: 'dateTime',
      apply: (draft, value) => {
        objectAt(draft, 'period').end = value;
      },
    },
    {
      id: 'Encounter.type',
      min: 0,
      accepts: ['const', 'field', 'coding'],
      coerce: 'concept',
      apply: (draft, value) => {
        appendTo(draft, 'type', conceptOf(value));
      },
    },
    {
      // Also the subject of every Observation the Encounter projects.
      id: 'Encounter.subject',
      min: 0,
      accepts: ['doc', 'field'],
      coerce: 'reference',
      referenceType: 'Patient',
      apply: (draft, value) => {
        draft.subject = referenceTo(value);
      },
    },
    {
      id: 'Encounter.participant.individual',
      min: 0,
      accepts: ['doc'],
      coerce: 'reference',
      referenceType: 'Practitioner',
      apply: (draft, value) => {
        appendTo(draft, 'participant', { individual: referenceTo(value) });
      },
    },
    {
      id: 'Encounter.location.location',
      min: 0,
      accepts: ['doc', 'field'],
      coerce: 'reference',
      referenceType: 'Location',
      apply: (draft, value) => {
        appendTo(draft, 'location', { location: referenceTo(value) });
      },
    },
    {
      id: 'Encounter.reasonCode',
      min: 0,
      accepts: ['field', 'const', 'coding'],
      coerce: 'concept',
      apply: (draft, value) => {
        appendTo(draft, 'reasonCode', conceptOf(value));
      },
    },
  ],
};

/**
 * Observations are projected from an Encounter binding's `observations` — a
 * user never binds one directly, so there are no element rows.
 */
const OBSERVATION: ResourceTypeSpec = {
  sourceKind: null,
  searchParams: [
    { name: '_id', type: 'token', documentation: 'Synthesised as <reportUuid>.<code>.' },
    { name: 'encounter', type: 'reference', documentation: 'Encounter/<report uuid>.' },
  ],
  elements: [],
};

export const RESOURCE_TYPES: Readonly<Record<FacadeResourceType, ResourceTypeSpec>> = {
  Patient: PATIENT,
  Encounter: ENCOUNTER,
  Observation: OBSERVATION,
};

export const findElementSpec = (
  resourceType: FacadeResourceType,
  elementId: string,
): ElementSpec | undefined => RESOURCE_TYPES[resourceType].elements.find(spec => spec.id === elementId);

/**
 * Does this binding serve that resource type? A binding serves its own type,
 * and a binding that projects observations also serves Observation.
 */
export const bindingServesType = (
  binding: { readonly resourceType: FacadeResourceType; readonly observations: Readonly<Record<string, unknown>> },
  resourceType: FacadeResourceType,
): boolean => resourceType === 'Observation'
  ? Object.keys(binding.observations).length > 0
  : binding.resourceType === resourceType;
