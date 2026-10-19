/**
 * The `settings.fhir` configuration: types, parsing and validation.
 *
 * The shape mirrors what cht-ui-builder writes. Two rules govern this module:
 *
 * 1. **Never throw on a bad config.** api loads app_settings through
 *    `config-watcher`, which `process.exit(1)`s when a load fails. A
 *    mistyped mapping must degrade to diagnostics, not take the server down.
 * 2. **Errors are scoped.** A broken binding is excluded on its own; only a
 *    facade-level error (a missing `canonicalBase`, say) disables everything.
 *
 * Unknown keys are tolerated and ignored.
 */
import {
  type FacadeResourceType,
  FACADE_RESOURCE_TYPES,
  RESOURCE_TYPES,
  findElementSpec,
} from './catalog';

/* ------------------------------- binding keys ----------------------------- */

// The builder percent-encodes `%` and `/` within each segment; `:` is left
// alone because a form id legally contains one.
const decodeSegment = (segment: string): string => segment
  .replaceAll(/%2F/gi, '/')
  .replaceAll('%25', '%');

const FACADE_SOURCE_KINDS = ['contact_type', 'form'] as const;
type FacadeSourceKind = typeof FACADE_SOURCE_KINDS[number];

interface DecodedBindingKey {
  readonly resourceType: FacadeResourceType;
  readonly sourceKind: FacadeSourceKind;
  readonly sourceId: string;
}

/** `<ResourceType>/<sourceKind>/<sourceId>`. Null rather than throwing — an unparseable key is a diagnostic. */
const decodeBindingKey = (key: string): DecodedBindingKey | null => {
  const [resourceType, sourceKind, ...rest] = key.split('/');
  if (!rest.join('/') || !(FACADE_RESOURCE_TYPES as readonly string[]).includes(resourceType)) {
    return null;
  }
  if (!(FACADE_SOURCE_KINDS as readonly string[]).includes(sourceKind)) {
    return null;
  }
  return {
    resourceType: resourceType as FacadeResourceType,
    sourceKind: sourceKind as FacadeSourceKind,
    sourceId: decodeSegment(rest.join('/')),
  };
};

/* --------------------------------- types ---------------------------------- */

/**
 * Where a value comes from.
 *
 * The builder's schema also has an `expr` kind carrying raw JS. It is
 * deliberately unsupported: the facade is on the read path of every request.
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
  /** `{base}` is resolved against `facade.canonicalBase`. */
  readonly system: string;
  readonly use?: string;
  readonly type?: Coding;
  readonly source: ChtSource;
}

export type ObservationValueMode =
  | 'auto' | 'valueCodeableConcept' | 'valueQuantity'
  | 'valueString' | 'valueBoolean' | 'valueDateTime';

export interface ObservationProjection {
  readonly codeSource: 'question-mapping' | 'ad-hoc';
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

export interface ResourceBinding {
  readonly key: string;
  readonly resourceType: FacadeResourceType;
  readonly sourceKind: FacadeSourceKind;
  readonly sourceId: string;
  readonly sourceFilter: SourceFilter | null;
  readonly elements: Readonly<Record<string, ChtSource>>;
  readonly identifiers: readonly IdentifierBinding[];
  /** Keyed by question key, which `questionMappings` and the ad-hoc codes are keyed by too. */
  readonly observations: Readonly<Record<string, ObservationProjection>>;
}

export interface AdHocCodeSystem {
  readonly canonical: string;
  readonly codes: Readonly<Record<string, Coding>>;
}

export interface FacadeConfig {
  readonly canonicalBase: string;
  readonly bindings: readonly ResourceBinding[];
  readonly questionMappings: Readonly<Record<string, Coding>>;
  readonly adHocCodeSystem: AdHocCodeSystem | null;
}

export interface FacadeDiagnostic {
  readonly severity: 'error' | 'warn' | 'info';
  /** Stable machine id, e.g. `element-unknown`. */
  readonly ruleId: string;
  readonly message: string;
  readonly bindingKey: string | null;
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

/**
 * The value a document must carry for a binding to claim it: a bare form code
 * for a report, or a contact type id for a contact.
 *
 * A binding's form id is the builder's namespaced key (`app:pregnancy`) while
 * a report's `form` is the bare code (`pregnancy`), so the prefix is stripped.
 */
export const sourceMatchKey = (binding: ResourceBinding): string => {
  return binding.sourceKind === 'form' ? binding.sourceId.replace(/^[^:]*:/, '') : binding.sourceId;
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

/**
 * Where an Observation's code comes from.
 *
 * `ad-hoc` codes must have been minted and stored by the configuration tool.
 * The facade will not invent one at serve time: a published code is a
 * promise, and a code derived from a field name would silently change the
 * moment somebody renamed the field.
 */
export const resolveObservationCode = (
  questionKey: string,
  projection: ObservationProjection,
  config: Pick<FacadeConfig, 'questionMappings' | 'adHocCodeSystem'>,
): Coding | null => {
  const codes = projection.codeSource === 'question-mapping'
    ? config.questionMappings
    : config.adHocCodeSystem?.codes;
  return codes?.[questionKey] ?? null;
};

/* -------------------------------- helpers --------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string | null => typeof value === 'string' && value.trim() !== '' ? value : null;

class Diagnostics {
  private readonly entries: FacadeDiagnostic[] = [];

  add(severity: FacadeDiagnostic['severity'], ruleId: string, message: string, bindingKey: string | null = null) {
    this.entries.push({ severity, ruleId, message, bindingKey });
  }

  all(): readonly FacadeDiagnostic[] {
    return this.entries;
  }

  hasErrorFor(bindingKey: string): boolean {
    return this.entries.some(e => e.severity === 'error' && e.bindingKey === bindingKey);
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

const parseChtSource = (raw: unknown, diag: Diagnostics, bindingKey: string, where: string): ChtSource | null => {
  if (!isRecord(raw)) {
    diag.add('error', 'source-malformed', `${where}: source must be an object.`, bindingKey);
    return null;
  }
  const parser = SOURCE_PARSERS.get(raw.kind);
  if (!parser) {
    diag.add(
      'error',
      'source-kind-unknown',
      `${where}: unsupported source kind ${JSON.stringify(raw.kind)}.`,
      bindingKey,
    );
    return null;
  }
  const source = parser.parse(raw);
  if (!source) {
    diag.add('error', 'source-malformed', `${where}: ${parser.problem}`, bindingKey);
  }
  return source;
};

/** Element sources sit under `source`; a malformed entry has none, which `parseChtSource` reports. */
const sourceOf = (entry: unknown): unknown => isRecord(entry) ? entry.source : undefined;

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
  bindingKey: string,
): Pick<SourceFilter, 'op' | 'value'> | null => {
  if (!FILTER_VALUE_RULES.has(raw.op)) {
    diag.add('error', 'source-filter-op-unknown', `sourceFilter: unknown op ${JSON.stringify(raw.op)}.`, bindingKey);
    return null;
  }
  const op = raw.op as FilterOp;
  const rule = FILTER_VALUE_RULES.get(op);
  if (!rule) {
    return { op };
  }
  if (!rule.valid(raw.value)) {
    diag.add('error', 'source-filter-value-invalid', `sourceFilter: op "${op}" needs ${rule.needs}.`, bindingKey);
    return null;
  }
  return { op, value: raw.value as string | readonly string[] };
};

const parseSourceFilter = (raw: unknown, diag: Diagnostics, bindingKey: string): SourceFilter | null => {
  if (isAbsent(raw)) {
    return null;
  }
  if (!isRecord(raw)) {
    diag.add('error', 'source-filter-malformed', 'sourceFilter must be an object or null.', bindingKey);
    return null;
  }
  const source = parseChtSource(raw.source, diag, bindingKey, 'sourceFilter');
  if (!source) {
    return null;
  }
  const condition = parseFilterCondition(raw, diag, bindingKey);
  return condition && { source, ...condition };
};

const IDENTIFIER_USES: ReadonlySet<unknown> = new Set(['usual', 'official', 'temp', 'secondary', 'old']);

const parseIdentifiers = (raw: unknown, diag: Diagnostics, bindingKey: string): readonly IdentifierBinding[] => {
  if (isAbsent(raw)) {
    return [];
  }
  if (!Array.isArray(raw)) {
    diag.add('error', 'identifiers-malformed', 'identifiers must be an array.', bindingKey);
    return [];
  }
  const out: IdentifierBinding[] = [];
  raw.forEach((entry, idx) => {
    const where = `identifiers[${idx}]`;
    const system = isRecord(entry) && asString(entry.system);
    if (!system) {
      diag.add('error', 'identifier-malformed', `${where}: must be an object with a system.`, bindingKey);
      return;
    }
    const source = parseChtSource(entry.source, diag, bindingKey, where);
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

const CODE_SOURCES: ReadonlySet<unknown> = new Set<ObservationProjection['codeSource']>(['question-mapping', 'ad-hoc']);

// The builder keeps excluded and orphaned questions in the file; neither is served.
const isServed = (entry: Record<string, unknown>): boolean => entry.include === true && entry.status !== 'orphaned';

const parseObservation = (
  questionKey: string,
  entry: unknown,
  diag: Diagnostics,
  bindingKey: string,
): ObservationProjection | null => {
  const where = `observation ${questionKey}`;
  if (!isRecord(entry)) {
    diag.add('error', 'observation-malformed', `${where} must be an object.`, bindingKey);
    return null;
  }
  if (!isServed(entry)) {
    return null;
  }
  if (!CODE_SOURCES.has(entry.codeSource)) {
    diag.add(
      'error',
      'observation-code-source-unknown',
      `${where}: codeSource must be "question-mapping" or "ad-hoc".`,
      bindingKey,
    );
    return null;
  }
  const source = parseChtSource(entry.source, diag, bindingKey, where);
  if (!source) {
    return null;
  }
  return {
    codeSource: entry.codeSource as ObservationProjection['codeSource'],
    valueMode: parseValueMode(entry.valueMode),
    unit: parseCoding(entry.unit) ?? undefined,
    source,
  };
};

const parseObservations = (
  raw: unknown,
  diag: Diagnostics,
  bindingKey: string,
): Readonly<Record<string, ObservationProjection>> => {
  if (isAbsent(raw)) {
    return {};
  }
  if (!isRecord(raw)) {
    diag.add('error', 'observations-malformed', 'observations must be an object.', bindingKey);
    return {};
  }
  const out: Record<string, ObservationProjection> = {};
  for (const [questionKey, entry] of Object.entries(raw)) {
    const projection = parseObservation(questionKey, entry, diag, bindingKey);
    if (projection) {
      out[questionKey] = projection;
    }
  }
  return out;
};

const parseElements = (raw: unknown, diag: Diagnostics, bindingKey: string): Record<string, ChtSource> => {
  const elements: Record<string, ChtSource> = {};
  if (!isRecord(raw)) {
    return elements;
  }
  for (const [elementId, entry] of Object.entries(raw)) {
    const source = parseChtSource(sourceOf(entry), diag, bindingKey, elementId);
    if (source) {
      elements[elementId] = source;
    }
  }
  return elements;
};

const parseBinding = (key: string, raw: unknown, diag: Diagnostics): ResourceBinding | null => {
  const decoded = decodeBindingKey(key);
  if (!decoded) {
    diag.add('error', 'binding-key-invalid', `Resource key ${JSON.stringify(key)} is not a valid binding key.`, key);
    return null;
  }
  if (!isRecord(raw)) {
    diag.add('error', 'binding-malformed', 'Resource binding must be an object.', key);
    return null;
  }
  if (raw.status === 'disabled' || raw.status === 'orphaned') {
    diag.add('info', 'binding-inactive', `Binding is ${raw.status} and will not be served.`, key);
    return null;
  }
  return {
    key,
    ...decoded,
    sourceFilter: parseSourceFilter(raw.sourceFilter, diag, key),
    elements: parseElements(raw.elements, diag, key),
    identifiers: parseIdentifiers(raw.identifiers, diag, key),
    observations: parseObservations(raw.observations, diag, key),
  };
};

const parseQuestionMappings = (raw: unknown): Record<string, Coding> => {
  const out: Record<string, Coding> = {};
  for (const [questionKey, entry] of Object.entries(isRecord(raw) ? raw : {})) {
    const coding = parseCoding(entry);
    // The builder keeps a mapping it was told to skip; it is not a code.
    if (coding && (entry as Record<string, unknown>).status !== 'skipped') {
      out[questionKey] = coding;
    }
  }
  return out;
};

const parseAdHocCodes = (raw: Record<string, unknown>, canonical: string): Record<string, Coding> => {
  const codes: Record<string, Coding> = {};
  for (const [questionKey, entry] of Object.entries(raw)) {
    const coding = isRecord(entry) ? parseCoding({ ...entry, system: canonical }) : null;
    if (coding) {
      codes[questionKey] = coding;
    }
  }
  return codes;
};

const parseAdHocCodeSystem = (raw: unknown): AdHocCodeSystem | null => {
  const canonical = isRecord(raw) && asString(raw.canonical);
  if (!canonical || !isRecord(raw.codes)) {
    return null;
  }
  return { canonical, codes: parseAdHocCodes(raw.codes, canonical) };
};

/* ------------------------------- validation ------------------------------- */

/** False, with a diagnostic, when the key names the wrong kind of CHT source for its resource type. */
const checkSourceKind = (binding: ResourceBinding, diag: Diagnostics): boolean => {
  const expectedKind = RESOURCE_TYPES[binding.resourceType].sourceKind;
  if (binding.sourceKind === expectedKind) {
    return true;
  }
  diag.add(
    'error',
    'binding-source-kind-mismatch',
    expectedKind
      ? `${binding.resourceType} is bound to a ${expectedKind}, but this key names a ${binding.sourceKind}.`
      : `${binding.resourceType} is projected from an Encounter's observations and cannot be bound directly.`,
    binding.key,
  );
  return false;
};

const hasObservations = (binding: ResourceBinding): boolean => Object.keys(binding.observations).length > 0;

/** False, with a diagnostic, when a binding that is not an Encounter projects observations. */
const checkObservationHost = (binding: ResourceBinding, diag: Diagnostics): boolean => {
  if (!hasObservations(binding) || binding.resourceType === 'Encounter') {
    return true;
  }
  diag.add(
    'error',
    'observations-host-invalid',
    'Only an Encounter may project observations: a projected Observation\'s encounter names '
    + `Encounter/<reportUuid>, which is not true of a ${binding.resourceType}.`,
    binding.key,
  );
  return false;
};

const validateBoundElements = (binding: ResourceBinding, diag: Diagnostics): void => {
  for (const [elementId, source] of Object.entries(binding.elements)) {
    const spec = findElementSpec(binding.resourceType, elementId);
    if (!spec) {
      diag.add('error', 'element-unknown', `${elementId} is not an element of ${binding.resourceType}.`, binding.key);
    } else if (!spec.accepts.includes(source.kind)) {
      diag.add(
        'error',
        'element-source-kind-rejected',
        `${elementId} does not accept a ${source.kind} source (accepts ${spec.accepts.join(', ')}).`,
        binding.key,
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
        binding.key,
      );
    }
  }
};

/** Checks that need the element catalog. */
const validateAgainstCatalog = (binding: ResourceBinding, diag: Diagnostics): void => {
  if (!checkSourceKind(binding, diag) || !checkObservationHost(binding, diag)) {
    return;
  }
  validateBoundElements(binding, diag);
  validateRequiredElements(binding, diag);
  if (hasObservations(binding) && !binding.elements['Encounter.subject']) {
    diag.add(
      'warn',
      'observation-subject-missing',
      'Observations are configured but Encounter.subject is not bound, so they will be served without a subject.',
      binding.key,
    );
  }
};

/** A diagnostic's severity, rule id and message, for the caller to scope to a binding. */
type Issue = readonly [FacadeDiagnostic['severity'], string, string];

const unresolvedCodeIssue = (where: string, projection: ObservationProjection): Issue => {
  return projection.codeSource === 'ad-hoc'
    ? [
      'error',
      'observation-adhoc-code-unminted',
      `${where}: no ad-hoc code has been minted. Mint codes in the configuration tool; the facade will not invent one.`,
    ]
    : ['warn', 'observation-code-unmapped', `${where}: no code is mapped for this question.`];
};

/** What is wrong with a resolved code, or null once it has been recorded in `seen` as taken. */
const claimCode = (where: string, code: string, questionKey: string, seen: Map<string, string>): Issue | null => {
  if (!FHIR_ID_PATTERN.test(code)) {
    return [
      'error',
      'observation-code-not-id-safe',
      `${where}: code ${JSON.stringify(code)} cannot appear in a FHIR id.`,
    ];
  }
  if (code.length > OBSERVATION_CODE_MAX_LENGTH) {
    return [
      'error',
      'observation-code-too-long',
      `${where}: code ${JSON.stringify(code)} is ${code.length} characters. `
      + `An Observation id is <reportUuid>.<code>, and a CHT uuid takes up to ${CHT_DOC_ID_MAX_LENGTH} of the `
      + `${FHIR_ID_MAX_LENGTH} a FHIR id allows, so a code may be at most ${OBSERVATION_CODE_MAX_LENGTH}.`,
    ];
  }
  const clash = seen.get(code);
  if (clash !== undefined) {
    return [
      'error',
      'observation-code-duplicate',
      `${where}: code ${code} is already used by ${clash} in this resource.`,
    ];
  }
  seen.set(code, questionKey);
  return null;
};

/**
 * Every observation must resolve to a code whose id is representable, and
 * codes must be distinct within a binding — two fields sharing one code
 * would collide on `<reportUuid>.<code>`.
 */
const validateObservationCodes = (
  binding: ResourceBinding,
  codes: Pick<FacadeConfig, 'questionMappings' | 'adHocCodeSystem'>,
  diag: Diagnostics,
): void => {
  const seen = new Map<string, string>();
  for (const [questionKey, projection] of Object.entries(binding.observations)) {
    const where = `observation ${questionKey}`;
    const resolved = resolveObservationCode(questionKey, projection, codes);
    const issue = resolved
      ? claimCode(where, resolved.code, questionKey, seen)
      : unresolvedCodeIssue(where, projection);
    if (issue) {
      diag.add(...issue, binding.key);
    }
  }
};

/**
 * Patient searches are one `Person.v1` page per contact type, and datasource
 * cursors from two pages cannot be merged into one, so only one Patient
 * binding is served. Encounter bindings all share one report query.
 */
const validateSinglePatient = (bindings: readonly ResourceBinding[], diag: Diagnostics): void => {
  const [first, ...rest] = bindings.filter(binding => binding.resourceType === 'Patient');
  for (const binding of rest) {
    diag.add(
      'error',
      'patient-binding-duplicate',
      `Only one Patient binding is supported, and ${first.key} is already bound.`,
      binding.key,
    );
  }
};

/**
 * Parse and validate `settings.fhir`. Returns `{ config: null }` when the
 * facade cannot serve at all; individual broken bindings are dropped with a
 * diagnostic and the rest still serve.
 */
export const loadConfig = (raw: unknown): LoadResult => {
  const diag = new Diagnostics();

  const facade = isRecord(raw) ? raw.facade : undefined;
  if (!isRecord(facade) || !isRecord(facade.resources)) {
    diag.add('error', 'facade-missing', 'settings.fhir.facade.resources is missing. No resources are configured.');
    return { config: null, diagnostics: diag.all() };
  }
  const canonicalBase = asString(facade.canonicalBase);
  if (!canonicalBase) {
    diag.add(
      'error',
      'canonical-base-missing',
      'facade.canonicalBase is required. Generated identifier systems are permanent public identifiers, '
      + 'so the facade will not invent one.',
    );
    return { config: null, diagnostics: diag.all() };
  }

  const codes = {
    questionMappings: parseQuestionMappings((raw as Record<string, unknown>).questionMappings),
    adHocCodeSystem: parseAdHocCodeSystem((raw as Record<string, unknown>).adHocCodeSystem),
  };
  const parsed = Object.entries(facade.resources)
    .map(([key, entry]) => parseBinding(key, entry, diag))
    .filter((binding): binding is ResourceBinding => binding !== null);
  for (const binding of parsed) {
    validateAgainstCatalog(binding, diag);
    validateObservationCodes(binding, codes, diag);
  }
  validateSinglePatient(parsed.filter(binding => !diag.hasErrorFor(binding.key)), diag);

  const bindings = parsed.filter(binding => !diag.hasErrorFor(binding.key));
  if (!bindings.length) {
    diag.add('error', 'no-servable-bindings', 'No resource binding is servable.');
    return { config: null, diagnostics: diag.all() };
  }
  return { config: { canonicalBase, bindings, ...codes }, diagnostics: diag.all() };
};
