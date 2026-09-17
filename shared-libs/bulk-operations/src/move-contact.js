const db = require('./libs/db');
const lineage = require('./libs/lineage');
const dataContext = require('./libs/data-context');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const nouveau = require('@medic/nouveau');
const { BULK_OPERATIONS } = require('@medic/constants');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const { ValidationError } = require('./errors');
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
 * Resolves the contact being moved and its destination from the database as they are now.
 * @throws {ValidationError} when either contact no longer exists
 */
const resolveContacts = async ({ contact_id: contactId, parent_id: parentId }) => {
  const getContact = dataContext.bind(Contact.v1.get);
  const [ source, destination ] = await Promise.all([
    getContact(Qualifier.byUuid(contactId)),
    parentId ? getContact(Qualifier.byUuid(parentId)) : null,
  ]);

  if (!source) {
    throw new ValidationError(`contact '${contactId}' not found`);
  }
  if (parentId && !destination) {
    throw new ValidationError(`destination contact '${parentId}' not found`);
  }
  return { source, destination };
};

/**
 * Checks that the move can legally run, against the documents as they are now. Called by the API
 * before queuing, so the caller gets a 400 rather than an operation that is only going to fail, and
 * again by Sentinel at plan time, because the hierarchy may have changed in between.
 * @param {Object} params
 * @param {string} params.contact_id - the contact being moved
 * @param {string|null} [params.parent_id] - the new parent, or null to move to the top level
 * @throws {ValidationError} when the move would be illegal
 */
const validate = async (params) => {
  const { source, destination } = await resolveContacts(params);
  const contactIds = await getSubtreeIds(source._id);
  await constraints.assertMoveIsLegal(source, destination, contactIds);
};

/**
 * Gathers everything a move touches. Assumes `validate` has passed.
 * @param {Object} params
 * @param {string} params.contact_id - the contact being moved
 * @param {string|null} [params.parent_id] - the new parent, or null to move to the top level
 * @returns {Promise<Object>} the summary of changes and the actions to run, in execution order
 */
const plan = async (params) => {
  const { source, destination } = await resolveContacts(params);
  const id = source._id;
  const contactIds = await getSubtreeIds(id);

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

  const actions = [
    { action: ACTIONS.SET_PARENT, operations: setParentOperations },
    { action: ACTIONS.SET_CONTACT, operations: [ ...reportOperations, ...placeOperations ] },
  ];

  return { summary, actions };
};

module.exports = {
  validate,
  plan,
};
