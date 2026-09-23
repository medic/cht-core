/**
 * Executes the FHIR facade's query plans and assembles the responses.
 *
 * The split with `@medic/cht-fhir` is deliberate: that library decides *what*
 * to fetch and *how to shape* the result, and knows nothing about CouchDB.
 * This module is the only part that reaches the data — and it reaches it
 * through cht-datasource alone. No view is queried directly, so the facade
 * inherits cursor validation, settings-driven contact-type filtering and
 * over-fetch correction rather than reimplementing them.
 */
const logger = require('@medic/logger');
const { Contact, Person, Qualifier, Report } = require('@medic/cht-datasource');
const {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  bindingMatchesDoc,
  bindingServesType,
  loadConfig,
  mapDocument,
  parseObservationId,
  planRead,
  planSearch,
  projectObservations,
} = require('@medic/cht-fhir');
const config = require('../config');
const ctx = require('./data-context');

/**
 * Bind on first use rather than at require time, and memoise.
 *
 * Some cht-datasource operations touch the database while being bound —
 * `Contact.v1.getUuidsPage` probes for the offline freetext ddoc to decide
 * between Nouveau and the map/reduce views — and requiring this module should
 * not issue a query.
 */
const boundOps = new Map();
const bound = (operation) => {
  if (!boundOps.has(operation)) {
    boundOps.set(operation, ctx.bind(operation));
  }
  return boundOps.get(operation);
};

/* ------------------------------ config cache ------------------------------ */

// Keyed on the settings object's identity: `config.set` replaces it wholesale
// on every reload, so a changed key is a changed reference.
let cached = { raw: undefined, result: { config: null, diagnostics: [] } };

const LOG = { error: 'error', warn: 'warn', info: 'debug' };

/** The loaded mapping and its diagnostics, which are logged once per settings change. */
const getFacade = () => {
  const raw = config.get('fhir');
  if (raw !== cached.raw) {
    const result = loadConfig(raw);
    for (const { severity, ruleId, message, bindingKey } of result.diagnostics) {
      logger[LOG[severity]](`FHIR facade config: ${ruleId}: ${message}${bindingKey ? ` (${bindingKey})` : ''}`);
    }
    cached = { raw, result };
  }
  return cached.result;
};

/** True when no mapping is configured at all, as opposed to a broken one. */
const isConfigured = () => config.get('fhir') !== undefined && config.get('fhir') !== null;

/* ------------------------------ plan execution ---------------------------- */

const fetchUuidsThenDocs = async (Api, qualifier, plan) => {
  const idPage = await bound(Api.v1.getUuidsPage)(qualifier, plan.cursor, plan.limit);
  if (!idPage.data.length) {
    return { docs: [], cursor: null };
  }
  const docPage = await bound(Api.v1.getPage)(Qualifier.byIds([...idPage.data]), null, idPage.data.length);
  return { docs: docPage.data, cursor: idPage.cursor };
};

const runPlan = async (plan) => {
  switch (plan.kind) {
    case 'read': {
      const doc = await bound(plan.op === 'person' ? Person.v1.get : Report.v1.get)(Qualifier.byUuid(plan.uuid));
      return { docs: doc ? [doc] : [], cursor: null };
    }
    case 'person-by-type': {
      const page = await bound(Person.v1.getPage)(Qualifier.byContactType(plan.contactType), plan.cursor, plan.limit);
      return { docs: page.data, cursor: page.cursor };
    }
    case 'contact-by-type-freetext':
      return fetchUuidsThenDocs(
        Contact,
        Qualifier.and(Qualifier.byFreetext(plan.freetext), Qualifier.byContactType(plan.contactType)),
        plan,
      );
    case 'report-by-forms':
      return fetchUuidsThenDocs(Report, Qualifier.byForms([...plan.forms]), plan);
  }
};

/* -------------------------------- rendering ------------------------------- */

/**
 * Turn fetched documents into resources.
 *
 * A query plan is coarser than a binding — a page of reports spans every bound
 * form — so each document is matched to the binding that claims it before it
 * is rendered. One report can yield many Observations, hence the spread.
 */
const renderAll = (facade, resourceType, docs) => {
  const bindings = facade.bindings.filter(binding => bindingServesType(binding, resourceType));
  const resources = [];
  for (const doc of docs) {
    const binding = bindings.find(candidate => bindingMatchesDoc(candidate, doc));
    if (!binding) {
      continue;
    }
    const mapCtx = { config: facade, warn: (message) => logger.warn(`FHIR facade: ${doc._id}: ${message}`) };
    if (resourceType === 'Observation') {
      resources.push(...projectObservations(binding, doc, mapCtx));
    } else {
      resources.push(mapDocument(binding, doc, mapCtx));
    }
  }
  return resources;
};

/* ------------------------------ reads & searches -------------------------- */

/** A single resource by id, or null when nothing maps to it. */
const read = async (facade, resourceType, id) => {
  if (resourceType === 'Observation') {
    const parsed = parseObservationId(id);
    if (!parsed) {
      return null;
    }
    const { docs } = await runPlan(planRead(resourceType, parsed.reportUuid));
    return renderAll(facade, resourceType, docs).find(observation => observation.id === id) ?? null;
  }
  const { docs } = await runPlan(planRead(resourceType, id));
  return renderAll(facade, resourceType, docs)[0] ?? null;
};

const parseLimit = (value) => {
  if (value === undefined || value === '') {
    return DEFAULT_PAGE_SIZE;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
};

/** One page of a search: `{ resources, cursor }`, or `{ error }` when the request cannot be planned. */
const search = async (facade, resourceType, params, cursor, limit) => {
  const planned = planSearch(facade, resourceType, { params, cursor, limit });
  if (!planned.ok) {
    return { error: planned.message };
  }
  const { docs, cursor: nextCursor } = await runPlan(planned.plan);
  return { resources: renderAll(facade, resourceType, docs), cursor: nextCursor };
};

module.exports = {
  getFacade,
  isConfigured,
  read,
  search,
  parseLimit,
};
