/**
 * Turns a CHT document plus a resource binding into a FHIR R4 resource.
 *
 * Pure: no I/O, no clock, no randomness. The two jobs that are easy to
 * underestimate:
 *
 *  - **Coercion.** CHT stores `reported_date` as epoch milliseconds, dates as
 *    `'1991-11-6'` (which FHIR rejects — it wants `'1991-11-06'`), and every
 *    form answer as a string even when it is a number. None of that is
 *    FHIR-shaped.
 *  - **Pseudo-paths.** An element id is not a FHIR path.
 *    `Patient.telecom.phone` is a ContactPoint with `system: 'phone'`;
 *    `Patient.name.text` is `name[0].text`, and has to merge with
 *    `Patient.name.family` rather than overwrite it. The catalog's `apply`
 *    functions own that; the mapper only decides what value to hand them.
 */
import {
  type ChtSource,
  type FacadeConfig,
  type IdentifierBinding,
  type ObservationProjection,
  type ObservationValueMode,
  type ResourceBinding,
  type SourceFilter,
  FHIR_ID_PATTERN,
  isBlank,
  observationId,
  resolveSource,
  trimTrailingSlashes,
} from './config';
import {
  type CodingValue,
  type Coercion,
  type ElementSpec,
  type ElementValue,
  RESOURCE_TYPES,
  findElementSpec,
} from './catalog';

/**
 * Every Observation the facade projects is an answer to a question on a CHT
 * form, which is what R4 means by `survey`.
 */
const surveyCategory = () => [{
  coding: [{
    system: 'http://terminology.hl7.org/CodeSystem/observation-category', // NOSONAR - a FHIR canonical, never fetched
    code: 'survey',
    display: 'Survey',
  }],
  text: 'Survey',
}];

/* -------------------------------- coercion -------------------------------- */

const pad = (value: string): string => value.padStart(2, '0');

/** `1991-11-6`, `1991-11-06` — CHT does not zero-pad, and FHIR requires it. */
const DATE_ONLY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const dateOnlyMatch = (value: unknown): RegExpExecArray | null => {
  return typeof value === 'string' ? DATE_ONLY.exec(value.trim()) : null;
};

/**
 * The regex admits 1991-13-45, and Node rolls 1991-02-31 forward to March,
 * so compare the round-trip rather than trusting the parse to fail.
 */
const padDateOnly = ([, year, month, day]: RegExpExecArray): string | null => {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  const probe = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(probe.getTime()) || !probe.toISOString().startsWith(iso) ? null : iso;
};

/** Epoch milliseconds and full timestamps are absolute, so UTC is correct for them. */
const toInstant = (value: unknown): Date | null => {
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * A date-only string is padded arithmetically, NOT by round-tripping through
 * `Date`. `new Date('1991-11-6')` is parsed as local midnight, so
 * re-formatting it in UTC moves a birth date to the 5th east of Greenwich and
 * formatting it locally moves epoch-millisecond values instead. Handling the
 * two cases separately is the only way both come out right in every zone.
 */
export const coerceDate = (value: unknown): string | null => {
  const dateOnly = dateOnlyMatch(value);
  if (dateOnly) {
    return padDateOnly(dateOnly);
  }
  return toInstant(value)?.toISOString().slice(0, 10) ?? null;
};

/**
 * FHIR `dateTime` accepts a date-only value, so a date-only source keeps its
 * precision rather than being given a spurious midnight-UTC time.
 */
export const coerceDateTime = (value: unknown): string | null => {
  if (dateOnlyMatch(value)) {
    return coerceDate(value);
  }
  return toInstant(value)?.toISOString() ?? null;
};

/**
 * The text of a scalar, or null for anything else. An object has no honest
 * text form: `String({})` is `"[object Object]"`, which every coercion would
 * accept and the facade would then serve.
 */
const scalarText = (value: unknown): string | null => {
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      return null;
  }
};

const trimmedText = (value: unknown): string | null => scalarText(value)?.trim() || null;

const TRUE_VALUES = new Set(['yes', 'true', '1']);
const FALSE_VALUES = new Set(['no', 'false', '0']);

export const coerceBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = scalarText(value)?.trim().toLowerCase() ?? '';
  if (TRUE_VALUES.has(text)) {
    return true;
  }
  return FALSE_VALUES.has(text) ? false : null;
};

export const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const text = trimmedText(value);
  if (text === null) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

export type Warn = (message: string) => void;

const isCodingValue = (value: unknown): value is CodingValue => {
  return typeof value === 'object' && value !== null
    && typeof (value as CodingValue).system === 'string'
    && typeof (value as CodingValue).code === 'string';
};

type Coercer = (spec: ElementSpec, raw: unknown, warn: Warn) => ElementValue | null;

/** A coercion that warns, naming what it expected, when it rejects a value. */
const warnOnReject = (coerce: (raw: unknown) => string | null, expected: string): Coercer => (spec, raw, warn) => {
  const value = coerce(raw);
  if (value === null) {
    warn(`${spec.id}: ${JSON.stringify(raw)} is not ${expected}.`);
  }
  return value;
};

const coerceCode: Coercer = (spec, raw, warn) => {
  // FHIR codes are case-sensitive and these value sets are lowercase, so
  // trim and lowercase before checking rather than rejecting 'Female'.
  const code = scalarText(raw)?.trim().toLowerCase() ?? '';
  if (!spec.codes || spec.codes.includes(code)) {
    return code;
  }
  warn(
    `${spec.id}: ${JSON.stringify(raw)} is not in the required value set `
    + `(${spec.codes.join(' | ')}); the element is omitted.`,
  );
  return null;
};

const COERCERS: Readonly<Record<Coercion, Coercer>> = {
  date: warnOnReject(coerceDate, 'a date'),
  dateTime: warnOnReject(coerceDateTime, 'a date/time'),
  code: coerceCode,
  // A `coding` source arrives already shaped; anything else is text.
  concept: (spec, raw) => isCodingValue(raw) ? raw : trimmedText(raw),
  reference: (spec, raw) => {
    const id = trimmedText(raw);
    return id && `${spec.referenceType}/${id}`;
  },
  string: (spec, raw) => trimmedText(raw),
};

/* ------------------------------ source filter ----------------------------- */

export const matchesSourceFilter = (filter: SourceFilter | null, doc: Record<string, unknown>): boolean => {
  if (!filter) {
    return true;
  }
  const raw = resolveSource(filter.source, doc);
  const text = scalarText(raw);
  switch (filter.op) {
    case 'exists':
      return !isBlank(raw);
    case 'not-exists':
      return isBlank(raw);
    case 'eq':
      return text === filter.value;
    case 'ne':
      return text !== filter.value;
    case 'in':
      return text !== null && Array.isArray(filter.value) && filter.value.includes(text);
  }
};

/**
 * Does this binding claim this document?
 *
 * The read path needs this because a query plan is necessarily coarser than a
 * binding — a report page spans every bound form.
 *
 * The contact-type branch is `contactTypeUtils.getTypeId` inlined rather than
 * imported, which keeps this package dependency-free.
 */
export const bindingMatchesDoc = (binding: ResourceBinding, doc: Record<string, unknown>): boolean => {
  if (!matchesSourceFilter(binding.sourceFilter, doc)) {
    return false;
  }
  if (binding.resourceType === 'Encounter') {
    return binding.sourceId === doc.form;
  }
  const typeId = doc.type === 'contact' ? doc.contact_type : doc.type;
  return typeId === binding.sourceId;
};

/* --------------------------------- reading -------------------------------- */

export interface MapContext {
  readonly config: FacadeConfig;
  readonly warn?: Warn;
}

const noopWarn: Warn = () => { /* diagnostics are optional at map time */ };

/**
 * One value, with a repeat group reported rather than stringified.
 *
 * An XLSForm repeat group arrives as an array, and `String([{…}])` is
 * `"[object Object]"` — which every coercion accepts and the facade would then
 * serve. An element the facade cannot honestly fill is omitted instead.
 */
const readValue = (source: ChtSource, doc: Record<string, unknown>, warn: Warn, where: string): unknown => {
  const raw = resolveSource(source, doc);
  if (!Array.isArray(raw) || !raw.length) {
    return raw;
  }
  warn(`${where}: the source resolves to a list of ${raw.length} values rather than one.`);
  return undefined;
};

/* ------------------------------- identifiers ------------------------------ */

const buildIdentifier = (
  identifier: IdentifierBinding,
  doc: Record<string, unknown>,
  canonicalBase: string,
  warn: Warn,
): Record<string, unknown> | null => {
  const value = scalarText(readValue(identifier.source, doc, warn, `identifier ${identifier.system}`));
  if (!value) {
    return null;
  }
  const built: Record<string, unknown> = {
    system: identifier.system.split('{base}').join(trimTrailingSlashes(canonicalBase)),
    value,
  };
  if (identifier.use) {
    built.use = identifier.use;
  }
  if (identifier.type) {
    built.type = { coding: [{ ...identifier.type }] };
  }
  return built;
};

/* ------------------------------ main mapping ------------------------------ */

/**
 * `meta.versionId` is the document's CouchDB `_rev`.
 *
 * `meta.lastUpdated` uses `reported_date`, the only timestamp CHT documents
 * reliably carry. For a contact that is its creation date, not its last
 * edit — better than omitting it, but not a change-detection signal.
 */
const buildMeta = (doc: Record<string, unknown>): Record<string, unknown> => {
  const meta: Record<string, unknown> = {};
  if (typeof doc._rev === 'string') {
    meta.versionId = doc._rev;
  }
  // `reported_date` is epoch milliseconds, so this is always a full instant.
  const lastUpdated = coerceDateTime(doc.reported_date);
  if (lastUpdated) {
    meta.lastUpdated = lastUpdated;
  }
  return meta;
};

/** The coerced value of one bound element, or null when it is unbound, blank or unusable. */
const elementValue = (
  binding: ResourceBinding,
  spec: ElementSpec,
  doc: Record<string, unknown>,
  warn: Warn,
): ElementValue | null => {
  const source = binding.elements[spec.id];
  if (!source) {
    return null;
  }
  const raw = readValue(source, doc, warn, spec.id);
  if (isBlank(raw)) {
    if (spec.min === 1) {
      warn(`${spec.id} is required but its source resolved to nothing.`);
    }
    return null;
  }
  return COERCERS[spec.coerce](spec, raw, warn);
};

export const mapDocument = (
  binding: ResourceBinding,
  doc: Record<string, unknown>,
  ctx: MapContext,
): Record<string, unknown> => {
  const warn = ctx.warn ?? noopWarn;

  const draft: Record<string, unknown> = {
    resourceType: binding.resourceType,
    id: doc._id as string,
    meta: buildMeta(doc),
  };

  const identifiers = binding.identifiers
    .map(identifier => buildIdentifier(identifier, doc, ctx.config.canonicalBase, warn))
    .filter((identifier): identifier is Record<string, unknown> => identifier !== null);
  if (identifiers.length) {
    draft.identifier = identifiers;
  }

  // Iterate the catalog rather than the config so output field order is
  // stable and independent of JSON key order in the configuration.
  for (const spec of RESOURCE_TYPES[binding.resourceType].elements) {
    const value = elementValue(binding, spec, doc, warn);
    if (value !== null) {
      spec.apply(draft, value);
    }
  }
  return draft;
};

/* --------------------------- observation projection ----------------------- */

type ValueMode = Exclude<ObservationValueMode, 'auto'>;

const inferValueMode = (raw: unknown, projection: ObservationProjection): ValueMode => {
  if (projection.unit) {
    return 'valueQuantity';
  }
  if (coerceBoolean(raw) !== null) {
    return 'valueBoolean';
  }
  if (coerceNumber(raw) !== null) {
    return 'valueQuantity';
  }
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return 'valueDateTime';
  }
  return 'valueString';
};

/** The `value[x]` field for one answer, or null when the answer does not fit the mode. */
type ValueBuilder = (raw: unknown, projection: ObservationProjection, warn: Warn) => Record<string, unknown> | null;

/** Wraps a coerced answer as its `value[x]` field, warning when the answer does not coerce. */
const coercedValue = <T>(
  coerce: (raw: unknown) => T | null,
  expected: string,
  wrap: (value: T, projection: ObservationProjection) => Record<string, unknown>,
): ValueBuilder => (raw, projection, warn) => {
  const value = coerce(raw);
  if (value === null) {
    warn(`${JSON.stringify(raw)} is not ${expected}.`);
    return null;
  }
  return wrap(value, projection);
};

const quantity = (value: number, { unit }: ObservationProjection) => ({
  valueQuantity: unit
    ? { value, unit: unit.display ?? unit.code, system: unit.system, code: unit.code }
    : { value },
});

const VALUE_BUILDERS: Readonly<Record<ValueMode, ValueBuilder>> = {
  valueBoolean: coercedValue(coerceBoolean, 'a boolean', valueBoolean => ({ valueBoolean })),
  valueDateTime: coercedValue(coerceDateTime, 'a date/time', valueDateTime => ({ valueDateTime })),
  valueQuantity: coercedValue(coerceNumber, 'a number', quantity),
  // No answer codes yet, so the answer is carried as text.
  valueCodeableConcept: coercedValue(trimmedText, 'text', text => ({ valueCodeableConcept: { text } })),
  valueString: coercedValue(scalarText, 'text', valueString => ({ valueString })),
};

const observationValue = (projection: ObservationProjection, raw: unknown, warn: Warn) => {
  const mode = projection.valueMode === 'auto' ? inferValueMode(raw, projection) : projection.valueMode;
  return VALUE_BUILDERS[mode](raw, projection, warn);
};

/** The Encounter's visit date, which the Observations inherit. */
const effectiveDateTimeFor = (binding: ResourceBinding, doc: Record<string, unknown>): string | null => {
  const periodStart = binding.elements['Encounter.period.start'];
  const raw = periodStart ? resolveSource(periodStart, doc) : doc.reported_date;
  return coerceDateTime(isBlank(raw) ? doc.reported_date : raw);
};

const ENCOUNTER_SUBJECT = findElementSpec('Encounter', 'Encounter.subject')!;

/** What every Observation projected from one report shares: its Encounter, subject and time. */
const reportLinks = (binding: ResourceBinding, doc: Record<string, unknown>, warn: Warn): Record<string, unknown> => {
  const subject = elementValue(binding, ENCOUNTER_SUBJECT, doc, warn);
  const effective = effectiveDateTimeFor(binding, doc);
  return {
    encounter: { reference: `Encounter/${doc._id as string}` },
    ...(subject ? { subject: { reference: subject } } : {}),
    ...(effective ? { effectiveDateTime: effective } : {}),
  };
};

interface ReportContext {
  readonly doc: Record<string, unknown>;
  readonly warn: Warn;
  readonly links: Record<string, unknown>;
}

const projectObservation = (
  report: ReportContext,
  projection: ObservationProjection,
): Record<string, unknown> | null => {
  const { doc, warn } = report;
  const { code } = projection;
  const where = `observation ${code.code}`;
  const raw = readValue(projection.source, doc, warn, where);
  if (isBlank(raw)) {
    return null;
  }
  const id = observationId(doc._id as string, code.code);
  if (!FHIR_ID_PATTERN.test(id)) {
    warn(`${where}: synthesised id ${id} is not a valid FHIR id.`);
    return null;
  }
  const value = observationValue(projection, raw, message => warn(`${where}: ${message}`));
  return value && {
    resourceType: 'Observation',
    id,
    meta: buildMeta(doc),
    status: 'final',
    category: surveyCategory(),
    code: code.display ? { coding: [{ ...code }], text: code.display } : { coding: [{ ...code }] },
    ...report.links,
    ...value,
  };
};

/**
 * Project a report's configured fields into Observations.
 *
 * One document becomes many resources, so each needs a synthetic id —
 * `<reportUuid>.<code>`.
 */
export const projectObservations = (
  binding: ResourceBinding,
  doc: Record<string, unknown>,
  ctx: MapContext,
): Record<string, unknown>[] => {
  const warn = ctx.warn ?? noopWarn;
  const report = { doc, warn, links: reportLinks(binding, doc, warn) };
  return binding.observations
    .map(projection => projectObservation(report, projection))
    .filter((observation): observation is Record<string, unknown> => observation !== null);
};
