/**
 * The `settings.fhir` configuration: types, parsing and validation.
 *
 * Two rules govern this module:
 *
 * 1. **Never throw on a bad config.** api loads app_settings through
 *    `config-watcher`, which `process.exit(1)`s when a load fails. A
 *    mistyped mapping must degrade to diagnostics, not take the server down.
 * 2. **Errors are scoped.** A broken binding is excluded on its own; only a
 *    top-level error (a missing `canonicalBase`, say) disables everything.
 *
 * Unknown keys are tolerated and ignored.
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
  /** Where the binding sits in the config, `patient` or `encounters.<form>`. Scopes its diagnostics. */
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

export interface FacadeDiagnostic {
  readonly severity: 'error' | 'warn';
  /** Stable machine id, e.g. `element-unknown`. */
  readonly ruleId: string;
  readonly message: string;
  /** The binding's `scope`, or null for a top-level diagnostic. */
  readonly scope: string | null;
}

export interface LoadResult {
  /** Null when the facade cannot serve. `diagnostics` says why. */
  readonly config: FacadeConfig | null;
  readonly diagnostics: readonly FacadeDiagnostic[];
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

class Diagnostics {
  private readonly entries: FacadeDiagnostic[] = [];

  add(severity: FacadeDiagnostic['severity'], ruleId: string, message: string, scope: string | null = null) {
    this.entries.push({ severity, ruleId, message, scope });
  }

  all(): readonly FacadeDiagnostic[] {
    return this.entries;
  }

  hasErrorFor(scope: string): boolean {
    return this.entries.some(e => e.severity === 'error' && e.scope === scope);
  }
}

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

const parseChtSource = (raw: unknown, diag: Diagnostics, scope: string, where: string): ChtSource | null => {
  if (!isRecord(raw)) {
    diag.add('error', 'source-malformed', `${where}: source must be an object.`, scope);
    return null;
  }
  const parser = SOURCE_PARSERS.get(raw.kind);
  if (!parser) {
    diag.add(
      'error',
      'source-kind-unknown',
      `${where}: unsupported source kind ${JSON.stringify(raw.kind)}.`,
      scope,
    );
    return null;
  }
  const source = parser.parse(raw);
  if (!source) {
    diag.add('error', 'source-malformed', `${where}: ${parser.problem}`, scope);
  }
  return source;
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

const parseFilterCondition = (
  raw: Record<string, unknown>,
  diag: Diagnostics,
  scope: string,
): Pick<SourceFilter, 'op' | 'value'> | null => {
  if (!FILTER_VALUE_RULES.has(raw.op)) {
    diag.add('error', 'source-filter-op-unknown', `sourceFilter: unknown op ${JSON.stringify(raw.op)}.`, scope);
    return null;
  }
  const op = raw.op as FilterOp;
  const rule = FILTER_VALUE_RULES.get(op);
  if (!rule) {
    return { op };
  }
  if (!rule.valid(raw.value)) {
    diag.add('error', 'source-filter-value-invalid', `sourceFilter: op "${op}" needs ${rule.needs}.`, scope);
    return null;
  }
  return { op, value: raw.value as string | readonly string[] };
};

const parseSourceFilter = (raw: unknown, diag: Diagnostics, scope: string): SourceFilter | null => {
  if (isAbsent(raw)) {
    return null;
  }
  if (!isRecord(raw)) {
    diag.add('error', 'source-filter-malformed', 'sourceFilter must be an object or null.', scope);
    return null;
  }
  const source = parseChtSource(raw.source, diag, scope, 'sourceFilter');
  if (!source) {
    return null;
  }
  const condition = parseFilterCondition(raw, diag, scope);
  return condition && { source, ...condition };
};

const IDENTIFIER_USES: ReadonlySet<unknown> = new Set(['usual', 'official', 'temp', 'secondary', 'old']);

const parseIdentifiers = (raw: unknown, diag: Diagnostics, scope: string): readonly IdentifierBinding[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!Array.isArray(raw)) {
    diag.add('error', 'identifiers-malformed', 'identifiers must be an array.', scope);
    return [];
  }
  const out: IdentifierBinding[] = [];
  raw.forEach((entry, idx) => {
    const where = `identifiers[${idx}]`;
    const system = isRecord(entry) && asString(entry.system);
    if (!system) {
      diag.add('error', 'identifier-malformed', `${where}: must be an object with a system.`, scope);
      return;
    }
    const source = parseChtSource(entry.source, diag, scope, where);
    if (!source) {
      return;
    }
    // R4 binds `Identifier.use` required, so any other value would make the resource invalid.
    const use = IDENTIFIER_USES.has(entry.use) ? entry.use as string : undefined;
    const type = parseCoding(entry.type) ?? undefined;
    out.push({ system, use, type, source });
  });
  return out;
};

const VALUE_MODES: ReadonlySet<unknown> = new Set<ObservationValueMode>([
  'auto', 'valueCodeableConcept', 'valueQuantity', 'valueString', 'valueBoolean', 'valueDateTime',
]);

const parseValueMode = (raw: unknown): ObservationValueMode => {
  return VALUE_MODES.has(raw) ? raw as ObservationValueMode : 'auto';
};

const parseObservation = (
  entry: unknown,
  diag: Diagnostics,
  scope: string,
  where: string,
): ObservationProjection | null => {
  if (!isRecord(entry)) {
    diag.add('error', 'observation-malformed', `${where} must be an object.`, scope);
    return null;
  }
  const code = parseCoding(entry.code);
  if (!code) {
    diag.add('error', 'observation-code-malformed', `${where}: code needs system and code.`, scope);
    return null;
  }
  const source = parseChtSource(entry.source, diag, scope, where);
  if (!source) {
    return null;
  }
  return {
    code,
    valueMode: parseValueMode(entry.valueMode),
    unit: parseCoding(entry.unit) ?? undefined,
    source,
  };
};

const parseObservations = (raw: unknown, diag: Diagnostics, scope: string): readonly ObservationProjection[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!Array.isArray(raw)) {
    diag.add('error', 'observations-malformed', 'observations must be an array.', scope);
    return [];
  }
  return raw
    .map((entry, idx) => parseObservation(entry, diag, scope, `observations[${idx}]`))
    .filter((projection): projection is ObservationProjection => projection !== null);
};

const parseElements = (raw: unknown, diag: Diagnostics, scope: string): Record<string, ChtSource> => {
  const elements: Record<string, ChtSource> = {};
  if (!isRecord(raw)) {
    return elements;
  }
  for (const [elementId, entry] of Object.entries(raw)) {
    const source = parseChtSource(entry, diag, scope, elementId);
    if (source) {
      elements[elementId] = source;
    }
  }
  return elements;
};

const parseBinding = (
  resourceType: BoundResourceType,
  scope: string,
  sourceId: string,
  raw: Record<string, unknown>,
  diag: Diagnostics,
): ResourceBinding => ({
  scope,
  resourceType,
  sourceId,
  sourceFilter: parseSourceFilter(raw.sourceFilter, diag, scope),
  elements: parseElements(raw.elements, diag, scope),
  identifiers: parseIdentifiers(raw.identifiers, diag, scope),
  observations: resourceType === 'Encounter' ? parseObservations(raw.observations, diag, scope) : [],
});

const parsePatient = (raw: unknown, diag: Diagnostics): ResourceBinding | null => {
  if (isAbsent(raw)) {
    return null;
  }
  const contactType = isRecord(raw) && asString(raw.contactType);
  if (!contactType) {
    diag.add('error', 'binding-malformed', 'patient must be an object with a contactType.', 'patient');
    return null;
  }
  return parseBinding('Patient', 'patient', contactType, raw as Record<string, unknown>, diag);
};

/** Keyed by form code, as it appears in a report's `form`. */
const parseEncounters = (raw: unknown, diag: Diagnostics): ResourceBinding[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!isRecord(raw)) {
    diag.add('error', 'encounters-malformed', 'encounters must be an object keyed by form code.');
    return [];
  }
  const bindings: ResourceBinding[] = [];
  for (const [form, entry] of Object.entries(raw)) {
    const scope = `encounters.${form}`;
    if (isRecord(entry)) {
      bindings.push(parseBinding('Encounter', scope, form, entry, diag));
    } else {
      diag.add('error', 'binding-malformed', 'An encounter binding must be an object.', scope);
    }
  }
  return bindings;
};

/* ------------------------------- validation ------------------------------- */

const validateBoundElements = (binding: ResourceBinding, diag: Diagnostics): void => {
  for (const [elementId, source] of Object.entries(binding.elements)) {
    const spec = findElementSpec(binding.resourceType, elementId);
    if (!spec) {
      diag.add('error', 'element-unknown', `${elementId} is not an element of ${binding.resourceType}.`, binding.scope);
    } else if (!spec.accepts.includes(source.kind)) {
      diag.add(
        'error',
        'element-source-kind-rejected',
        `${elementId} does not accept a ${source.kind} source (accepts ${spec.accepts.join(', ')}).`,
        binding.scope,
      );
    }
  }
};

const validateRequiredElements = (binding: ResourceBinding, diag: Diagnostics): void => {
  for (const spec of RESOURCE_TYPES[binding.resourceType].elements) {
    if (spec.min === 1 && !binding.elements[spec.id]) {
      diag.add(
        'error',
        'required-element-unbound',
        `${spec.id} is required by ${binding.resourceType} but is not bound.`,
        binding.scope,
      );
    }
  }
};

/** Checks that need the element catalog. */
const validateAgainstCatalog = (binding: ResourceBinding, diag: Diagnostics): void => {
  validateBoundElements(binding, diag);
  validateRequiredElements(binding, diag);
  if (binding.observations.length && !binding.elements['Encounter.subject']) {
    diag.add(
      'warn',
      'observation-subject-missing',
      'Observations are configured but Encounter.subject is not bound, so they will be served without a subject.',
      binding.scope,
    );
  }
};

/** A rule id and message for what is wrong with an observation's code, or null once `seen` records it as taken. */
const claimCode = (where: string, code: string, seen: Map<string, string>): readonly [string, string] | null => {
  if (!FHIR_ID_PATTERN.test(code)) {
    return ['observation-code-not-id-safe', `${where}: code ${JSON.stringify(code)} cannot appear in a FHIR id.`];
  }
  if (code.length > OBSERVATION_CODE_MAX_LENGTH) {
    return [
      'observation-code-too-long',
      `${where}: code ${JSON.stringify(code)} is ${code.length} characters. `
      + `An Observation id is <reportUuid>.<code>, and a CHT uuid takes up to ${CHT_DOC_ID_MAX_LENGTH} of the `
      + `${FHIR_ID_MAX_LENGTH} a FHIR id allows, so a code may be at most ${OBSERVATION_CODE_MAX_LENGTH}.`,
    ];
  }
  const clash = seen.get(code);
  if (clash !== undefined) {
    return ['observation-code-duplicate', `${where}: code ${code} is already used by ${clash}.`];
  }
  seen.set(code, where);
  return null;
};

/**
 * Every observation code must fit in a FHIR id, and codes must be distinct
 * within a binding — two fields sharing one code would collide on
 * `<reportUuid>.<code>`.
 */
const validateObservationCodes = (binding: ResourceBinding, diag: Diagnostics): void => {
  const seen = new Map<string, string>();
  binding.observations.forEach((projection, idx) => {
    const issue = claimCode(`observations[${idx}]`, projection.code.code, seen);
    if (issue) {
      diag.add('error', ...issue, binding.scope);
    }
  });
};

/**
 * Parse and validate `settings.fhir`. Returns `{ config: null }` when the
 * facade cannot serve at all; individual broken bindings are dropped with a
 * diagnostic and the rest still serve.
 */
export const loadConfig = (raw: unknown): LoadResult => {
  const diag = new Diagnostics();

  const canonicalBase = isRecord(raw) && asString(raw.canonicalBase);
  if (!canonicalBase) {
    diag.add(
      'error',
      'canonical-base-missing',
      'canonicalBase is required. Generated identifier systems are permanent public identifiers, '
      + 'so the facade will not invent one.',
    );
    return { config: null, diagnostics: diag.all() };
  }

  const patient = parsePatient((raw as Record<string, unknown>).patient, diag);
  const parsed = [
    ...(patient ? [patient] : []),
    ...parseEncounters((raw as Record<string, unknown>).encounters, diag),
  ];
  for (const binding of parsed) {
    validateAgainstCatalog(binding, diag);
    validateObservationCodes(binding, diag);
  }

  const bindings = parsed.filter(binding => !diag.hasErrorFor(binding.scope));
  if (!bindings.length) {
    diag.add('error', 'no-servable-bindings', 'No resource binding is servable.');
    return { config: null, diagnostics: diag.all() };
  }
  return { config: { canonicalBase, bindings }, diagnostics: diag.all() };
};
