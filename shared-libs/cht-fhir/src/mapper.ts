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
  type ResourceBinding,
  type SourceFilter,
  FHIR_ID_PATTERN,
  isBlank,
  observationId,
  resolveObservationCode,
  resolveSource,
  sourceMatchKey,
} from './config';
import { type CodingValue, type ElementSpec, type ElementValue, RESOURCE_TYPES, findElementSpec } from './catalog';

/**
 * Every Observation the facade projects is an answer to a question on a CHT
 * form, which is what R4 means by `survey`.
 */
const surveyCategory = () => [{
  coding: [{
    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
    code: 'survey',
    display: 'Survey',
  }],
  text: 'Survey',
}];

/* -------------------------------- coercion -------------------------------- */

const pad = (value: string): string => value.padStart(2, '0');

/** `1991-11-6`, `1991-11-06` — CHT does not zero-pad, and FHIR requires it. */
const DATE_ONLY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * A date-only string is padded arithmetically, NOT by round-tripping through
 * `Date`. `new Date('1991-11-6')` is parsed as local midnight, so
 * re-formatting it in UTC moves a birth date to the 5th east of Greenwich and
 * formatting it locally moves epoch-millisecond values instead. Handling the
 * two cases separately is the only way both come out right in every zone.
 */
export const coerceDate = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY.exec(value.trim());
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      const iso = `${year}-${pad(month)}-${pad(day)}`;
      // The regex admits 1991-13-45, and Node rolls 1991-02-31 forward to
      // March, so compare the round-trip rather than trusting the parse to fail.
      const probe = new Date(`${iso}T00:00:00.000Z`);
      if (Number.isNaN(probe.getTime()) || !probe.toISOString().startsWith(iso)) {
        return null;
      }
      return iso;
    }
  }
  // Epoch milliseconds and full timestamps are absolute, so UTC is correct.
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

/**
 * FHIR `dateTime` accepts a date-only value, so a date-only source keeps its
 * precision rather than being given a spurious midnight-UTC time.
 */
export const coerceDateTime = (value: unknown): string | null => {
  if (typeof value === 'string' && DATE_ONLY.test(value.trim())) {
    return coerceDate(value);
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const TRUE_VALUES = new Set(['yes', 'true', '1']);
const FALSE_VALUES = new Set(['no', 'false', '0']);

export const coerceBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(text)) {
    return true;
  }
  return FALSE_VALUES.has(text) ? false : null;
};

export const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const text = String(value).trim();
  if (text === '') {
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

const coerceForElement = (spec: ElementSpec, raw: unknown, warn: Warn): ElementValue | null => {
  switch (spec.coerce) {
    case 'date': {
      const date = coerceDate(raw);
      if (!date) {
        warn(`${spec.id}: ${JSON.stringify(raw)} is not a date.`);
      }
      return date;
    }
    case 'dateTime': {
      const dateTime = coerceDateTime(raw);
      if (!dateTime) {
        warn(`${spec.id}: ${JSON.stringify(raw)} is not a date/time.`);
      }
      return dateTime;
    }
    case 'code': {
      // FHIR codes are case-sensitive and these value sets are lowercase, so
      // trim and lowercase before checking rather than rejecting 'Female'.
      const code = String(raw).trim().toLowerCase();
      if (spec.codes && !spec.codes.includes(code)) {
        warn(
          `${spec.id}: ${JSON.stringify(raw)} is not in the required value set `
          + `(${spec.codes.join(' | ')}); the element is omitted.`,
        );
        return null;
      }
      return code;
    }
    case 'concept':
      // A `coding` source arrives already shaped; anything else is text.
      if (isCodingValue(raw)) {
        return raw;
      }
      return String(raw).trim() || null;
    case 'reference': {
      const id = String(raw).trim();
      return id ? `${spec.referenceType}/${id}` : null;
    }
    default:
      return String(raw).trim() || null;
  }
};

/* ------------------------------ source filter ----------------------------- */

export const matchesSourceFilter = (filter: SourceFilter | null, doc: Record<string, unknown>): boolean => {
  if (!filter) {
    return true;
  }
  const raw = resolveSource(filter.source, doc);
  switch (filter.op) {
    case 'exists':
      return !isBlank(raw);
    case 'not-exists':
      return isBlank(raw);
    case 'eq':
      return String(raw) === String(filter.value);
    case 'ne':
      return String(raw) !== String(filter.value);
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(String(raw));
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
  if (binding.sourceKind === 'form') {
    return sourceMatchKey(binding) === doc.form;
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
  const raw = readValue(identifier.source, doc, warn, `identifier ${identifier.system}`);
  if (isBlank(raw)) {
    return null;
  }
  const built: Record<string, unknown> = {
    system: identifier.system.split('{base}').join(canonicalBase.replace(/\/+$/, '')),
    value: String(raw),
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
  return coerceForElement(spec, raw, warn);
};

export const mapDocument = (
  binding: ResourceBinding,
  doc: Record<string, unknown>,
  ctx: MapContext,
): Record<string, unknown> => {
  const warn = ctx.warn ?? noopWarn;

  const draft: Record<string, unknown> = {
    resourceType: binding.resourceType,
    id: String(doc._id),
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

const inferValueMode = (raw: unknown, projection: ObservationProjection): ObservationProjection['valueMode'] => {
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

const applyObservationValue = (
  draft: Record<string, unknown>,
  projection: ObservationProjection,
  raw: unknown,
  questionKey: string,
  warn: Warn,
): boolean => {
  const mode = projection.valueMode === 'auto' ? inferValueMode(raw, projection) : projection.valueMode;
  switch (mode) {
    case 'valueBoolean': {
      const value = coerceBoolean(raw);
      if (value === null) {
        warn(`observation ${questionKey}: ${JSON.stringify(raw)} is not a boolean.`);
        return false;
      }
      draft.valueBoolean = value;
      return true;
    }
    case 'valueDateTime': {
      const value = coerceDateTime(raw);
      if (value === null) {
        warn(`observation ${questionKey}: ${JSON.stringify(raw)} is not a date/time.`);
        return false;
      }
      draft.valueDateTime = value;
      return true;
    }
    case 'valueQuantity': {
      const value = coerceNumber(raw);
      if (value === null) {
        warn(`observation ${questionKey}: ${JSON.stringify(raw)} is not a number.`);
        return false;
      }
      const { unit } = projection;
      draft.valueQuantity = unit
        ? { value, unit: unit.display ?? unit.code, system: unit.system, code: unit.code }
        : { value };
      return true;
    }
    case 'valueCodeableConcept':
      // No answer codes yet, so the answer is carried as text.
      draft.valueCodeableConcept = { text: String(raw).trim() };
      return true;
    default:
      draft.valueString = String(raw);
      return true;
  }
};

/** The Encounter's visit date, which the Observations inherit. */
const effectiveDateTimeFor = (binding: ResourceBinding, doc: Record<string, unknown>): string | null => {
  const periodStart = binding.elements['Encounter.period.start'];
  const raw = periodStart ? resolveSource(periodStart, doc) : doc.reported_date;
  return coerceDateTime(isBlank(raw) ? doc.reported_date : raw);
};

/**
 * Project a report's configured fields into Observations.
 *
 * One document becomes many resources, so each needs a synthetic id —
 * `<reportUuid>.<code>`. That is also why an unminted ad-hoc code is fatal
 * rather than something to paper over: without a stable code there is no
 * stable id.
 */
export const projectObservations = (
  binding: ResourceBinding,
  doc: Record<string, unknown>,
  ctx: MapContext,
): Record<string, unknown>[] => {
  const warn = ctx.warn ?? noopWarn;
  const reportUuid = String(doc._id);
  const subjectSpec = findElementSpec('Encounter', 'Encounter.subject')!;
  const subject = elementValue(binding, subjectSpec, doc, warn);
  const effective = effectiveDateTimeFor(binding, doc);

  const observations: Record<string, unknown>[] = [];
  for (const [questionKey, projection] of Object.entries(binding.observations)) {
    const code = resolveObservationCode(questionKey, projection, ctx.config);
    if (!code) {
      continue;
    }
    const raw = readValue(projection.source, doc, warn, `observation ${questionKey}`);
    if (isBlank(raw)) {
      continue;
    }
    const id = observationId(reportUuid, code.code);
    if (!FHIR_ID_PATTERN.test(id)) {
      warn(`observation ${questionKey}: synthesised id ${id} is not a valid FHIR id.`);
      continue;
    }
    const draft: Record<string, unknown> = {
      resourceType: 'Observation',
      id,
      meta: buildMeta(doc),
      status: 'final',
      category: surveyCategory(),
      code: code.display ? { coding: [{ ...code }], text: code.display } : { coding: [{ ...code }] },
      encounter: { reference: `Encounter/${reportUuid}` },
    };
    if (subject) {
      draft.subject = { reference: subject };
    }
    if (effective) {
      draft.effectiveDateTime = effective;
    }
    if (applyObservationValue(draft, projection, raw, questionKey, warn)) {
      observations.push(draft);
    }
  }
  return observations;
};
