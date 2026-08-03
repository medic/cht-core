/**
 * Legality checks for hierarchy operations.
 *
 * Ported from cht-conf `src/lib/hierarchy-operations/lineage-constraints.js`, with two changes.
 * cht-conf reads `contact_types` out of the settings doc and falls back to a hardcoded default;
 * server-side we already have the parsed configuration, so `@medic/contact-types-utils` does that
 * job. And cht-conf moves a list of contacts in one command, so it additionally rejects two sources
 * from the same lineage; a move here has a single source, so that check does not apply.
 */

const db = require('../../db');
const config = require('../../config');
const contactTypesUtils = require('@medic/contact-types-utils');
const { pluckIdsFromLineage } = require('./lineage-manipulation');
const { BadRequestError } = require('../../errors');

const getPrimaryContactId = (doc) => typeof doc?.contact === 'string' ? doc.contact : doc?.contact?._id;

/**
 * A contact may only be placed under a parent its configured type permits, and a type with no
 * configured parents may only sit at the root.
 */
const assertParentTypeIsAllowed = (settings, sourceDoc, destinationDoc) => {
  const sourceType = contactTypesUtils.getContactType(settings, sourceDoc);
  if (!sourceType) {
    throw new BadRequestError(`cannot move contact with unknown type '${contactTypesUtils.getTypeId(sourceDoc)}'`);
  }

  if (!destinationDoc) {
    if (contactTypesUtils.hasParents(sourceType)) {
      throw new BadRequestError(`contacts of type '${sourceType.id}' cannot be moved to the root`);
    }
    return;
  }

  const destinationType = contactTypesUtils.getContactType(settings, destinationDoc);
  if (!destinationType) {
    throw new BadRequestError(`destination contact '${destinationDoc._id}' has an unknown type`);
  }

  if (!contactTypesUtils.isParentOf(destinationType, sourceType)) {
    throw new BadRequestError(`contacts of type '${sourceType.id}' cannot have parent of type '${destinationType.id}'`);
  }
};

/**
 * Moving a contact beneath one of its own descendants would detach the subtree into a loop.
 */
const assertDestinationIsNotCurrentParent = (sourceDoc, destinationDoc) => {
  const currentParentId = sourceDoc.parent?._id || sourceDoc.parent;
  if ((destinationDoc?._id || null) === (currentParentId || null)) {
    throw new BadRequestError(`contact '${sourceDoc._id}' already has that parent`);
  }
};

const assertNoCircularHierarchy = (sourceDoc, destinationDoc) => {
  if (!destinationDoc) {
    return;
  }

  if (sourceDoc._id === destinationDoc._id) {
    throw new BadRequestError('cannot move a contact to itself');
  }

  const destinationAncestry = pluckIdsFromLineage(destinationDoc);
  if (destinationAncestry.includes(sourceDoc._id)) {
    throw new BadRequestError(
      `circular hierarchy: '${destinationDoc._id}' is a descendant of '${sourceDoc._id}'`
    );
  }
};

/**
 * A place's primary contact must live beneath that place. Any ancestor dropping out of the source's
 * lineage as a result of the move must therefore not have a primary contact inside the moved subtree.
 */
const assertNoPrimaryContactStranded = async (sourceDoc, destinationDoc, descendantIds) => {
  const sourceLineageIds = pluckIdsFromLineage(sourceDoc.parent);
  const destinationLineageIds = pluckIdsFromLineage(destinationDoc);
  const leavingLineage = sourceLineageIds.filter(id => !destinationLineageIds.includes(id));
  if (!leavingLineage.length) {
    return;
  }

  const result = await db.medic.allDocs({ keys: leavingLineage, include_docs: true });
  const moved = new Set(descendantIds);
  const stranded = result.rows
    .map(row => ({ place: row.doc, contactId: getPrimaryContactId(row.doc) }))
    .find(({ contactId }) => contactId && moved.has(contactId));

  if (stranded) {
    throw new BadRequestError(
      `cannot move '${sourceDoc._id}': it would strand the primary contact of '${stranded.place._id}'`
    );
  }
};

/**
 * The source's own primary contact must be a person, never a place.
 */
const assertSourcePrimaryContactIsPerson = async (settings, sourceDoc) => {
  const primaryContactId = getPrimaryContactId(sourceDoc);
  if (!primaryContactId) {
    return;
  }

  const primaryContact = await db.medic.get(primaryContactId).catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });

  if (primaryContact && !contactTypesUtils.isPerson(settings, primaryContact)) {
    throw new BadRequestError(
      `contact '${sourceDoc._id}' has a primary contact '${primaryContactId}' which is not a person`
    );
  }
};

/**
 * Runs every legality check for a move. Throws on the first violation; the caller turns that into a
 * `BadRequestError`, so any other failure (a database error, say) propagates as a 500 instead of
 * being reported to the caller as an invalid move.
 * @param {Object} sourceDoc - the contact being moved
 * @param {Object|null} destinationDoc - the new parent, or null when moving to the root
 * @param {string[]} descendantIds - the ids of the source and everything beneath it
 * @throws {BadRequestError} when the move would be illegal
 */
const assertMoveIsLegal = async (sourceDoc, destinationDoc, descendantIds) => {
  const settings = config.getAll();
  assertDestinationIsNotCurrentParent(sourceDoc, destinationDoc);
  assertNoCircularHierarchy(sourceDoc, destinationDoc);
  assertParentTypeIsAllowed(settings, sourceDoc, destinationDoc);
  await assertNoPrimaryContactStranded(sourceDoc, destinationDoc, descendantIds);
  await assertSourcePrimaryContactIsPerson(settings, sourceDoc);
};

module.exports = {
  assertMoveIsLegal,
};
