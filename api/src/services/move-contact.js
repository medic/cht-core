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
const constraints = require('./lineage-constraints');

const { ACTIONS } = BULK_OPERATIONS;

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
 * The direct parent of every contact in the moved subtree. `contacts_by_depth` emits
 * `[ancestorId, depth]` from the descendant, so keying on depth 1 gives each contact's parent without
 * reading a document. The source is the one contact the view cannot answer for, because its parent
 * sits outside the subtree and so is never one of the keys; it comes off the document in hand.
 */
const getParentIds = async (contactIds, source) => {
  const result = await db.medic.query('medic/contacts_by_depth', {
    keys: contactIds.map(id => [ id, 1 ]),
  });
  const byId = new Map(result.rows.map(row => [ row.id, row.key[0] ]));
  byId.set(source._id, source.parent?._id || source.parent);
  return byId;
};

// Nests ids into the minified lineage shape CHT stores, with `tail` sitting under the innermost id.
const nestLineage = (ids, tail) => ids.reduceRight(
  (parent, _id) => (parent ? { _id, parent } : { _id }),
  tail
);

/**
 * The chain from a contact's parent up to and including the source. A descendant's chain to the
 * source lies entirely inside the moved subtree, so the parent map is enough to walk it. The source
 * itself has no chain: its parent is replaced outright.
 */
const ancestorsToSource = (id, parentById, sourceId) => {
  if (id === sourceId) {
    return [];
  }

  const chain = [];
  let current = parentById.get(id);
  while (current) {
    chain.push(current);
    if (current === sourceId) {
      break;
    }
    current = parentById.get(current);
  }
  return chain;
};

// The lineage a contact should hold once the move is applied.
const buildNewLineage = (id, parentById, sourceId, replacementLineage) => nestLineage(
  ancestorsToSource(id, parentById, sourceId),
  replacementLineage
);

/**
 * Adds the reports the moved contacts authored, each paired with the author whose lineage it caches. A report
 * caches its author's lineage in `contact`, which goes stale the moment the author moves.
 */
const addReportPairsForChunk = async (chunk, pairs) => {
  const terms = chunk.map(id => `"${escapePhrase(id)}"`);
  const q = `submitter:(${terms.join(' OR ')})`;
  let bookmark = null;

  do {
    const response = await request.post({
      uri: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
      body: { q, limit: nouveau.RESULTS_LIMIT, bookmark },
    });
    const hits = response.hits ?? [];
    hits.forEach(hit => {
      pairs.push({ id: hit.id, current_contact_id: hit.fields?.submitter });
    });
    const exhausted = hits.length < nouveau.RESULTS_LIMIT || response.bookmark === bookmark;
    bookmark = exhausted ? null : response.bookmark;
  } while (bookmark);
};

const getReportAuthorPairs = async (contactIds) => {
  const remaining = [ ...contactIds ];
  const pairs = [];

  while (remaining.length) {
    await addReportPairsForChunk(remaining.splice(0, nouveau.BATCH_LIMIT), pairs);
  }

  return pairs;
};

/**
 * Places caching the lineage of a moved primary contact; unlike Delete this refreshes the reference
 * instead of clearing it. Moved places are included too: `set-parent` only rewrites `parent`, so
 * skipping them would leave a place whose `parent` and `contact` disagree.
 *
 * The view emits the primary contact's id as the row key, so the pairing comes straight out of it.
 */
const getPlacesToRefresh = async (contactIds) => {
  const result = await db.medic.query('medic/contacts_by_primary_contact', { keys: contactIds });
  return result.rows.map(row => ({ id: row.id, current_contact_id: row.key }));
};

/**
 * The source's own parent is replaced outright: it is the contact being moved. Every descendant keeps
 * its own parent and has the chain above the source rewritten, which is what walking the parent map
 * up to the source produces. A contact already at the root has no row in the map, so its
 * `current_parent_id` is undefined, and a move to the root leaves no parent at all.
 */
const buildSetParentOperations = (contactIds, parentById, sourceId, replacementLineage) => contactIds
  .map(id => ({
    id,
    current_parent_id: parentById.get(id),
    parent: buildNewLineage(id, parentById, sourceId, replacementLineage),
  }));

/**
 * Reports and places both cache a moved contact's lineage in a property called `contact`, so both are
 * refreshed the same way and share Delete's existing `set-contact` action. The cached copy is rebuilt
 * from the subtree rather than edited in place, so a copy that had drifted is corrected rather than
 * stepped over.
 */
const buildSetContactOperations = (pairs, parentById, sourceId, replacementLineage) => pairs
  .filter(({ current_contact_id: contactId }) => parentById.has(contactId))
  .map(({ id, current_contact_id: contactId }) => ({
    id,
    current_contact_id: contactId,
    contact: {
      _id: contactId,
      parent: buildNewLineage(contactId, parentById, sourceId, replacementLineage),
    },
  }));

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

  // The destination lineage is intentionally snapshotted at queue time. Queue time exclusion of
  // overlapping hierarchy operations, including stale destinations, is tracked in #11349.
  // `|| undefined` so a move to the root carries the absence of a parent rather than a null.
  const replacementLineage = lineage.minifyLineage(destination) || undefined;
  const [ parentById, reportPairs, places ] = await Promise.all([
    getParentIds(contactIds, source),
    getReportAuthorPairs(contactIds),
    getPlacesToRefresh(contactIds),
  ]);

  const setParentOperations = buildSetParentOperations(contactIds, parentById, id, replacementLineage);
  const reportOperations = buildSetContactOperations(reportPairs, parentById, id, replacementLineage);
  const placeOperations = buildSetContactOperations(places, parentById, id, replacementLineage);

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

// parent_id is optional: leaving it out moves the contact to the top level.
const parseParentId = (body) => {
  const parentId = body?.parent_id ?? null;
  if (parentId !== null && (typeof parentId !== 'string' || !parentId)) {
    throw new BadRequestError('parent_id must be a non-empty string');
  }
  return parentId;
};

// The target is checked before the destination, so an id of the wrong type for the endpoint is
// reported as such rather than as a missing destination.
const resolveTargets = async (getContact, get, { uuid, parentId, type }) => {
  const [ contact, destination ] = await Promise.all([
    get(uuid),
    parentId ? getContact(Qualifier.byUuid(parentId)) : null,
  ]);

  if (!contact) {
    throw new NotFoundError(`${type} not found`);
  }
  if (parentId && !destination) {
    throw new NotFoundError(`Destination contact ${parentId} not found`);
  }
  return { contact, destination };
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

    const parentId = parseParentId(req.body);
    const { uuid } = req.params;
    const { contact, destination } = await resolveTargets(getContact, get, { uuid, parentId, type });

    const result = await moveContactHierarchy(contact, destination, { dryRun });
    return res.status(dryRun ? 200 : 202).json(result);
  });
};

module.exports = {
  handleMove,
};
