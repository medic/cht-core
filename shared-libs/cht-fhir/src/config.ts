/**
 * The `settings.fhir` configuration: types, parsing and validation.
 *
 * `loadConfig` throws a `FacadeConfigError` naming the first problem it finds,
 * and a config with any problem serves nothing. Unknown keys are ignored.
 */
import { type FacadeResourceType, RESOURCE_TYPES, findElementSpec } from './catalog';

/* --------------------------------- types ---------------------------------- */

/**
 * Where a value comes from. There is deliberately no kind carrying raw JS:
 * the facade is on the read path of every request.
 */
export type ChtSource =
  /** A path on the CHT document, rooted at `doc`: `doc.phone`, `doc.contact._id`. */
  | { readonly kind: 'doc'; readonly path: string }
  /** A group-qualified path relative to `doc.fields`: `gestational_age.lmp_date`. */
  | { readonly kind: 'field'; readonly path: string }
  | { readonly kind: 'const'; readonly value: string }
  /** A literal coded concept, for a CodeableConcept element. A `const` there emits `{ text }` only. */
  | { readonly kind: 'coding'; readonly system: string; readonly code: string; readonly display?: string };

export type ChtSourceKind = ChtSource['kind'];

export interface Coding {
  readonly system: string;
  readonly code: string;
  readonly display?: string;
}

export interface IdentifierBinding {
  /** `{base}` is resolved against `canonicalBase`. */
  readonly system: string;
  readonly use?: string;
  readonly type?: Coding;
  readonly source: ChtSource;
}

export type ObservationValueMode =
  | 'auto' | 'valueCodeableConcept' | 'valueQuantity'
  | 'valueString' | 'valueBoolean' | 'valueDateTime';

export interface ObservationProjection {
  /** Also the tail of the Observation's id, `<reportUuid>.<code>`, so it must be stable. */
  readonly code: Coding;
  readonly valueMode: ObservationValueMode;
  readonly unit?: Coding;
  /**
   * Where the answer lives. Required, because report answers sit at arbitrary
   * form-group depth and the question key does not say where.
   */
  readonly source: ChtSource;
}

export type FilterOp = 'eq' | 'ne' | 'in' | 'exists' | 'not-exists';

/**
 * Narrows the source document set, because a CHT contact type is coarser
 * than the FHIR resource: a deployment with a single `person` type separates
 * patients from health workers on `doc.role`.
 */
export interface SourceFilter {
  readonly source: ChtSource;
  readonly op: FilterOp;
  readonly value?: string | readonly string[];
}

/** The binding types: Observations are projected from an Encounter rather than bound. */
export type BoundResourceType = Exclude<FacadeResourceType, 'Observation'>;

export interface ResourceBinding {
  /** Where the binding sits in the config, `patient` or `encounters.<form>`. Prefixes its errors. */
  readonly scope: string;
  readonly resourceType: BoundResourceType;
  /** The contact type id for a Patient, the form code for an Encounter. */
  readonly sourceId: string;
  readonly sourceFilter: SourceFilter | null;
  readonly elements: Readonly<Record<string, ChtSource>>;
  readonly identifiers: readonly IdentifierBinding[];
  /** Encounter only. */
  readonly observations: readonly ObservationProjection[];
}

export interface FacadeConfig {
  readonly canonicalBase: string;
  /** At most one Patient, then the Encounters. */
  readonly bindings: readonly ResourceBinding[];
}

/* ------------------------------ reading a source -------------------------- */

const getPath = (root: unknown, segments: readonly string[]): unknown => {
  let current = root;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

/** What a source resolves to on one document. */
export const resolveSource = (source: ChtSource, doc: Record<string, unknown>): unknown => {
  switch (source.kind) {
    case 'const':
      return source.value;
    case 'coding':
      return source.display
        ? { system: source.system, code: source.code, display: source.display }
        : { system: source.system, code: source.code };
    case 'doc': {
      const segments = source.path.split('.');
      return getPath(doc, segments[0] === 'doc' ? segments.slice(1) : segments);
    }
    case 'field':
      return getPath(doc.fields, source.path.split('.'));
  }
};

const isAbsent = (value: unknown): value is null | undefined => value === null || value === undefined;

/**
 * `canonicalBase` with any trailing slashes removed. A loop rather than
 * `/\/+$/`, which backtracks quadratically on a long run of slashes.
 */
export const trimTrailingSlashes = (value: string): string => {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end--;
  }
  return value.slice(0, end);
};

/** Blank values are omitted from the output rather than emitted empty. */
export const isBlank = (value: unknown): boolean => {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
};

/* ------------------------------ observation ids --------------------------- */

/** FHIR ids are `[A-Za-z0-9\-\.]{1,64}` — notably, no underscores. */
export const FHIR_ID_PATTERN = /^[A-Za-z0-9\-.]{1,64}$/;
const FHIR_ID_MAX_LENGTH = 64;

/**
 * The longest CHT document id an Observation id has to carry: a 36-character
 * UUID minted by the app, rather than the server's 32-character CouchDB id.
 */
const CHT_DOC_ID_MAX_LENGTH = 36;

/** How much of a FHIR id an Observation code may take: `<reportUuid>.<code>` minus the uuid and the dot. */
const OBSERVATION_CODE_MAX_LENGTH = FHIR_ID_MAX_LENGTH - CHT_DOC_ID_MAX_LENGTH - 1;

/**
 * An Observation is synthesised from one field of a report, so its id has to
 * carry both: `<reportUuid>.<code>`. Parsing splits on the FIRST dot, because
 * CHT uuids contain none but codes do (ICD-10 `Z34.9`).
 */
export const observationId = (reportUuid: string, code: string): string => `${reportUuid}.${code}`;

export const parseObservationId = (id: string): { reportUuid: string; code: string } | null => {
  const idx = id.indexOf('.');
  if (idx <= 0 || idx === id.length - 1) {
    return null;
  }
  return { reportUuid: id.slice(0, idx), code: id.slice(idx + 1) };
};

/* -------------------------------- helpers --------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string | null => typeof value === 'string' && value.trim() !== '' ? value : null;

/** A config that cannot serve. The message names where the problem is. */
export class FacadeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FacadeConfigError';
  }
}

const fail = (message: string): never => {
  throw new FacadeConfigError(message);
};

/* --------------------------------- parsing -------------------------------- */

const parseCoding = (raw: unknown): Coding | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const system = asString(raw.system);
  const code = asString(raw.code);
  const display = asString(raw.display);
  if (!system || !code) {
    return null;
  }
  return display ? { system, code, display } : { system, code };
};

interface SourceParser {
  readonly parse: (raw: Record<string, unknown>) => ChtSource | null;
  /** Why `parse` refused the source. */
  readonly problem: string;
}

const pathSource = (kind: 'doc' | 'field'): SourceParser => ({
  parse: (raw) => {
    const path = asString(raw.path);
    return path ? { kind, path } : null;
  },
  problem: `a ${kind} source needs a non-empty path.`,
});

const SOURCE_PARSERS: ReadonlyMap<unknown, SourceParser> = new Map<ChtSourceKind, SourceParser>([
  ['doc', pathSource('doc')],
  ['field', pathSource('field')],
  ['const', {
    parse: (raw) => typeof raw.value === 'string' ? { kind: 'const', value: raw.value } : null,
    problem: 'a const source needs a string value.',
  }],
  ['coding', {
    parse: (raw) => {
      const coding = parseCoding(raw);
      return coding ? { kind: 'coding', ...coding } : null;
    },
    problem: 'a coding source needs system and code.',
  }],
]);

const parseChtSource = (raw: unknown, where: string): ChtSource => {
  if (!isRecord(raw)) {
    return fail(`${where}: source must be an object.`);
  }
  const parser = SOURCE_PARSERS.get(raw.kind) ?? fail(`${where}: unsupported source kind ${JSON.stringify(raw.kind)}.`);
  return parser.parse(raw) ?? fail(`${where}: ${parser.problem}`);
};

const isString = (value: unknown): value is string => typeof value === 'string';

interface FilterValueRule {
  readonly valid: (value: unknown) => boolean;
  readonly needs: string;
}

/** What each op needs in `value`. The existence ops take none. */
const FILTER_VALUE_RULES: ReadonlyMap<unknown, FilterValueRule | null> = new Map<FilterOp, FilterValueRule | null>([
  ['eq', { valid: isString, needs: 'a string value' }],
  ['ne', { valid: isString, needs: 'a string value' }],
  ['in', { valid: (value) => Array.isArray(value) && value.every(isString), needs: 'an array of strings' }],
  ['exists', null],
  ['not-exists', null],
]);

const parseSourceFilter = (raw: unknown, where: string): SourceFilter | null => {
  if (isAbsent(raw)) {
    return null;
  }
  if (!isRecord(raw)) {
    return fail(`${where}: sourceFilter must be an object or null.`);
  }
  const source = parseChtSource(raw.source, `${where}.sourceFilter`);
  if (!FILTER_VALUE_RULES.has(raw.op)) {
    return fail(`${where}: sourceFilter has unknown op ${JSON.stringify(raw.op)}.`);
  }
  const op = raw.op as FilterOp;
  const rule = FILTER_VALUE_RULES.get(op);
  if (!rule) {
    return { source, op };
  }
  if (!rule.valid(raw.value)) {
    return fail(`${where}: sourceFilter op "${op}" needs ${rule.needs}.`);
  }
  return { source, op, value: raw.value as string | readonly string[] };
};

const IDENTIFIER_USES: ReadonlySet<unknown> = new Set(['usual', 'official', 'temp', 'secondary', 'old']);

const parseIdentifier = (entry: unknown, where: string): IdentifierBinding => {
  if (!isRecord(entry)) {
    return fail(`${where}: must be an object.`);
  }
  return {
    system: asString(entry.system) ?? fail(`${where}: needs a system.`),
    // R4 binds `Identifier.use` required, so any other value would make the resource invalid.
    use: IDENTIFIER_USES.has(entry.use) ? entry.use as string : undefined,
    type: parseCoding(entry.type) ?? undefined,
    source: parseChtSource(entry.source, where),
  };
};

const parseIdentifiers = (raw: unknown, where: string): readonly IdentifierBinding[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return fail(`${where}: identifiers must be an array.`);
  }
  return raw.map((entry, idx) => parseIdentifier(entry, `${where}.identifiers[${idx}]`));
};

const VALUE_MODES: ReadonlySet<unknown> = new Set<ObservationValueMode>([
  'auto', 'valueCodeableConcept', 'valueQuantity', 'valueString', 'valueBoolean', 'valueDateTime',
]);

const parseValueMode = (raw: unknown): ObservationValueMode => {
  return VALUE_MODES.has(raw) ? raw as ObservationValueMode : 'auto';
};

const parseObservation = (entry: unknown, where: string): ObservationProjection => {
  if (!isRecord(entry)) {
    return fail(`${where}: must be an object.`);
  }
  return {
    code: parseCoding(entry.code) ?? fail(`${where}: code needs system and code.`),
    valueMode: parseValueMode(entry.valueMode),
    unit: parseCoding(entry.unit) ?? undefined,
    source: parseChtSource(entry.source, where),
  };
};

const parseObservations = (raw: unknown, where: string): readonly ObservationProjection[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return fail(`${where}: observations must be an array.`);
  }
  return raw.map((entry, idx) => parseObservation(entry, `${where}.observations[${idx}]`));
};

const parseElements = (raw: unknown, where: string): Record<string, ChtSource> => {
  const elements: Record<string, ChtSource> = {};
  for (const [elementId, entry] of Object.entries(isRecord(raw) ? raw : {})) {
    elements[elementId] = parseChtSource(entry, `${where}.elements.${elementId}`);
  }
  return elements;
};

const parseBinding = (
  resourceType: BoundResourceType,
  scope: string,
  sourceId: string,
  raw: Record<string, unknown>,
): ResourceBinding => ({
  scope,
  resourceType,
  sourceId,
  sourceFilter: parseSourceFilter(raw.sourceFilter, scope),
  elements: parseElements(raw.elements, scope),
  identifiers: parseIdentifiers(raw.identifiers, scope),
  observations: resourceType === 'Encounter' ? parseObservations(raw.observations, scope) : [],
});

const parsePatient = (raw: unknown): ResourceBinding | null => {
  if (isAbsent(raw)) {
    return null;
  }
  const contactType = (isRecord(raw) && asString(raw.contactType)) || fail('patient: needs a contactType.');
  return parseBinding('Patient', 'patient', contactType, raw as Record<string, unknown>);
};

/** Keyed by form code, as it appears in a report's `form`. */
const parseEncounters = (raw: unknown): ResourceBinding[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!isRecord(raw)) {
    return fail('encounters must be an object keyed by form code.');
  }
  return Object.entries(raw).map(([form, entry]) => {
    const scope = `encounters.${form}`;
    return isRecord(entry) ? parseBinding('Encounter', scope, form, entry) : fail(`${scope}: must be an object.`);
  });
};

/* ------------------------------- validation ------------------------------- */

const validateBoundElements = (binding: ResourceBinding): void => {
  for (const [elementId, source] of Object.entries(binding.elements)) {
    const spec = findElementSpec(binding.resourceType, elementId)
      ?? fail(`${binding.scope}: ${elementId} is not an element of ${binding.resourceType}.`);
    if (!spec.accepts.includes(source.kind)) {
      fail(`${binding.scope}: ${elementId} does not accept a ${source.kind} source `
        + `(accepts ${spec.accepts.join(', ')}).`);
    }
  }
};

const validateRequiredElements = (binding: ResourceBinding): void => {
  for (const spec of RESOURCE_TYPES[binding.resourceType].elements) {
    if (spec.min === 1 && !binding.elements[spec.id]) {
      fail(`${binding.scope}: ${spec.id} is required by ${binding.resourceType} but is not bound.`);
    }
  }
};

/**
 * Every observation code must fit in a FHIR id, and codes must be distinct
 * within a binding — two fields sharing one code would collide on
 * `<reportUuid>.<code>`.
 */
const validateObservationCodes = (binding: ResourceBinding): void => {
  const seen = new Set<string>();
  binding.observations.forEach(({ code: { code } }, idx) => {
    const where = `${binding.scope}.observations[${idx}]`;
    if (!FHIR_ID_PATTERN.test(code)) {
      fail(`${where}: code ${JSON.stringify(code)} cannot appear in a FHIR id.`);
    }
    if (code.length > OBSERVATION_CODE_MAX_LENGTH) {
      fail(`${where}: code ${JSON.stringify(code)} is ${code.length} characters. `
        + `An Observation id is <reportUuid>.<code>, and a CHT uuid takes up to ${CHT_DOC_ID_MAX_LENGTH} of the `
        + `${FHIR_ID_MAX_LENGTH} a FHIR id allows, so a code may be at most ${OBSERVATION_CODE_MAX_LENGTH}.`);
    }
    if (seen.has(code)) {
      fail(`${where}: code ${code} is already used in this binding.`);
    }
    seen.add(code);
  });
};

/** Parse and validate `settings.fhir`. Throws a `FacadeConfigError` naming the first problem. */
export const loadConfig = (raw: unknown): FacadeConfig => {
  const canonicalBase = (isRecord(raw) && asString(raw.canonicalBase)) || fail(
    'canonicalBase is required. Generated identifier systems are permanent public identifiers, '
    + 'so the facade will not invent one.',
  );
  const patient = parsePatient((raw as Record<string, unknown>).patient);
  const bindings = [
    ...(patient ? [patient] : []),
    ...parseEncounters((raw as Record<string, unknown>).encounters),
  ];
  if (!bindings.length) {
    fail('Nothing is bound: configure a patient or at least one encounter.');
  }
  for (const binding of bindings) {
    validateBoundElements(binding);
    validateRequiredElements(binding);
    validateObservationCodes(binding);
  }
  return { canonicalBase, bindings };
};
