const db = require('../db');
const auth = require('../auth');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const nouveau = require('@medic/nouveau');
const lineage = require('@medic/lineage')(Promise, db.medic);
const serverUtils = require('../server-utils');
const dataContext = require('./data-context');
const bulkOperations = require('./bulk-operations');
const { NotFoundError, BadRequestError } = require('../errors');
const { BULK_OPERATIONS } = require('@medic/constants');
const { Contact, Qualifier } = require('@medic/cht-datasource');
// Required as a module, not destructured, so consumers can stub it with sinon.
const constraints = require('./hierarchy/lineage-constraints');
const {
  replaceParentLineage,
  replaceContactLineage,
} = require('./hierarchy/lineage-manipulation');

const { ACTIONS } = BULK_OPERATIONS;

// Documents are read a page at a time and turned straight into operations, so only one page is ever
// held in memory. A whole-district move can touch tens of thousands of documents, and the API is the
// half of this that has to stay cheap.
const DOC_PAGE_SIZE = 100;

// The id is embedded in a quoted nouveau phrase, so only the characters that can terminate or escape
// that phrase matter. `nouveau.escapeKeys` is for unquoted terms and would escape the hyphens in a
// uuid, which would stop it matching.
const escapePhrase = (value) => value.replaceAll(/[\\"]/g, String.raw`\$&`);

// contacts_by_depth emits a row for every contact beneath the key, so this is the subtree's ids.
const getSubtreeIds = async (id) => {
  const result = await db.medic.query('medic/contacts_by_depth', { key: [id] });
  return result.rows.map(row => row.id);
};

/**
 * Reads documents a page at a time, turning each page into operations and discarding the documents.
 * Only the operations, which are small, accumulate.
 */
const buildOperationsInPages = async (ids, buildPage) => {
  const remaining = [ ...ids ];
  const operations = [];

  while (remaining.length) {
    const page = remaining.splice(0, DOC_PAGE_SIZE);
    const result = await db.medic.allDocs({ keys: page, include_docs: true });
    operations.push(...buildPage(result.rows.map(row => row.doc).filter(Boolean)));
  }

  return operations;
};

/**
 * Ids of the reports the moved contacts authored. A report caches its author's lineage in `contact`,
 * which goes stale the moment the author moves. The nouveau index emits `contact:<lowercased id>` for
 * every report and is standard in cht-core, so there is no view fallback to maintain. Results are
 * paged with the bookmark rather than capped, so a prolific author is not silently truncated.
 */
const addReportIdsForChunk = async (chunk, ids) => {
  const terms = chunk.map(id => `"contact:${escapePhrase(id.toLowerCase())}"`);
  const q = `exact_match:(${terms.join(' OR ')})`;
  let bookmark = null;

  do {
    const response = await request.post({
      uri: `${environment.couchUrl}/_design/medic/_nouveau/reports_by_freetext`,
      body: { q, limit: nouveau.BATCH_LIMIT, bookmark },
    });
    const hits = response.hits ?? [];
    hits.forEach(hit => ids.add(hit.id));
    // A bookmark that does not advance means the index has no more to give; without this the loop
    // would spin forever inside the request.
    const exhausted = hits.length < nouveau.BATCH_LIMIT || response.bookmark === bookmark;
    bookmark = exhausted ? null : response.bookmark;
  } while (bookmark);
};

const getReportIdsByCreator = async (contactIds) => {
  const remaining = [ ...contactIds ];
  const ids = new Set();

  while (remaining.length) {
    await addReportIdsForChunk(remaining.splice(0, nouveau.BATCH_LIMIT), ids);
  }

  return [ ...ids ];
};

// Places caching the lineage of a moved primary contact; unlike Delete this refreshes the reference
// instead of clearing it. Moved places are included too: `set-parent` only rewrites `parent`, so
// skipping them would leave a place whose `parent` and `contact` disagree.
const getPlaceIdsToRefresh = async (contactIds) => {
  const result = await db.medic.query('medic/contacts_by_primary_contact', { keys: contactIds });
  return [ ...new Set(result.rows.map(row => row.id)) ];
};

/**
 * The source's own parent is replaced outright: it is the contact being moved. Every descendant keeps
 * its own parent and has the chain *above* the source rewritten, which is what `startingFromId` does.
 * The helpers rewrite the fetched document in place and `minify` strips it back to ids, so the value
 * read off is the minified lineage; the document itself is then discarded.
 */
const buildSetParentOperations = (docs, sourceId, replacementLineage) => docs
  .map(doc => {
    const currentParentId = doc.parent?._id || doc.parent;
    const params = doc._id === sourceId
      ? { replaceWith: replacementLineage }
      : { replaceWith: replacementLineage, startingFromId: sourceId };
    if (!replaceParentLineage(doc, params)) {
      return null;
    }
    lineage.minify(doc);
    // A move to the root leaves no parent at all, and the handler writes that absence back.
    return { id: doc._id, current_parent_id: currentParentId, parent: doc.parent };
  })
  .filter(Boolean);

/**
 * Reports and surviving places both cache the moved contact's lineage in a property called `contact`,
 * so both are refreshed the same way and share Delete's existing `set-contact` action.
 */
const buildSetContactOperations = (docs, sourceId, replacementLineage) => docs
  .map(doc => {
    const currentContactId = doc.contact?._id || doc.contact;
    if (!replaceContactLineage(doc, { replaceWith: replacementLineage, startingFromId: sourceId })) {
      return null;
    }
    lineage.minify(doc);
    return { id: doc._id, current_contact_id: currentContactId, contact: doc.contact };
  })
  .filter(Boolean);

/**
 * Gathers everything a move touches and queues it as a bulk operation.
 * @param {Object} source - the contact being moved
 * @param {Object|null} destination - the new parent, or null when moving to the top level
 * @param {Object} options
 * @param {boolean} options.dryRun - return the summary without queuing anything
 * @returns {Promise<Object>} the summary of changes, plus the bulk operation id when the operation
 *   was queued (omitted for a dry run)
 * @throws {BadRequestError} when the move is not legal
 */
const moveContactHierarchy = async (source, destination, { dryRun } = {}) => {
  const id = source._id;
  const contactIds = await getSubtreeIds(id);

  // Violations surface as BadRequestError; anything else is a real failure and propagates as a 500.
  await constraints.assertMoveIsLegal(source, destination, contactIds);

  const replacementLineage = lineage.minifyLineage(destination);
  const [ reportIds, placeIds ] = await Promise.all([
    getReportIdsByCreator(contactIds),
    getPlaceIdsToRefresh(contactIds),
  ]);

  const setParentOperations = await buildOperationsInPages(
    contactIds,
    docs => buildSetParentOperations(docs, id, replacementLineage)
  );
  const reportOperations = await buildOperationsInPages(
    reportIds,
    docs => buildSetContactOperations(docs, id, replacementLineage)
  );
  const placeOperations = await buildOperationsInPages(
    placeIds,
    docs => buildSetContactOperations(docs, id, replacementLineage)
  );

  const summary = {
    'set-parent': setParentOperations.length,
    'set-contact': { reports: reportOperations.length, places: placeOperations.length },
  };

  if (dryRun) {
    return { summary };
  }

  const bulkOperationId = await bulkOperations.queue([
    { action: ACTIONS.SET_PARENT, operations: setParentOperations },
    { action: ACTIONS.SET_CONTACT, operations: [ ...reportOperations, ...placeOperations ] },
  ]);

  return { summary, id: bulkOperationId };
};

/**
 * Builds the move express handler for a contact type. The person and place endpoints move a
 * hierarchy the same way, so they share this handler; each passes the pieces that make its endpoint
 * type-specific. `get` fetches the target as its own type and returns null for the wrong type, so a
 * place cannot be moved through the person endpoint or vice versa, and `type` names it for the
 * not-found message. The handler reads the `dry_run` query param and the optional `parent_id` body
 * property, asserts the required permission, resolves both contacts, and hands the type-agnostic
 * work off to `moveContactHierarchy`, responding with the summary (202 when queued, 200 for a dry
 * run).
 * @param {Object} options
 * @param {Function} options.get - fetches the target contact by uuid, or null when it is not this type
 * @param {string} options.type - the contact type name, used in the not-found message
 * @returns {Function} the express request handler
 */
const handleMove = ({ get, type }) => {
  // Bound here, not at module load: both controllers and this module's own tests require it.
  const getContact = dataContext.bind(Contact.v1.get);

  return serverUtils.doOrError(async (req, res) => {
    const dryRun = req.query.dry_run === 'true';
    await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_move_contact_hierarchy'] });

    // parent_id is optional: leaving it out moves the contact to the top level.
    const parentId = req.body?.parent_id ?? null;
    if (parentId !== null && (typeof parentId !== 'string' || !parentId)) {
      return serverUtils.error(new BadRequestError('parent_id must be a non-empty string'), req, res);
    }

    const { uuid } = req.params;
    const [ contact, destination ] = await Promise.all([
      get(uuid),
      parentId ? getContact(Qualifier.byUuid(parentId)) : null,
    ]);

    if (!contact) {
      return serverUtils.error(new NotFoundError(`${type} not found`), req, res);
    }
    if (parentId && !destination) {
      return serverUtils.error(new NotFoundError(`Destination contact ${parentId} not found`), req, res);
    }

    const result = await moveContactHierarchy(contact, destination, { dryRun });
    return res.status(dryRun ? 200 : 202).json(result);
  });
};

module.exports = {
  handleMove,
};
