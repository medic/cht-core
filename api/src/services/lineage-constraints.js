const db = require('../db');
const config = require('../config');
const contactTypesUtils = require('@medic/contact-types-utils');
const lineage = require('@medic/lineage')(Promise, db.medic);
const { BadRequestError } = require('../errors');


/**
 * A contact may only be placed under a parent its configured type permits, and a type with no
 * configured parents may only sit at the root.
 */
const assertRootIsAllowed = (sourceType) => {
  if (contactTypesUtils.hasParents(sourceType)) {
    throw new BadRequestError(`contacts of type '${sourceType.id}' cannot be moved to the root`);
  }
};

const assertParentTypeIsAllowed = (settings, sourceDoc, destinationDoc) => {
  const sourceType = contactTypesUtils.getContactType(settings, sourceDoc);
  if (!sourceType) {
    throw new BadRequestError(`cannot move contact with unknown type '${contactTypesUtils.getTypeId(sourceDoc)}'`);
  }

  if (!destinationDoc) {
    return assertRootIsAllowed(sourceType);
  }

  const destinationType = contactTypesUtils.getContactType(settings, destinationDoc);
  if (!destinationType) {
    throw new BadRequestError(`destination contact '${destinationDoc._id}' has an unknown type`);
  }

  if (!contactTypesUtils.isParentOf(destinationType, sourceType)) {
    throw new BadRequestError(`contacts of type '${sourceType.id}' cannot have parent of type '${destinationType.id}'`);
  }
};

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

  const destinationAncestry = lineage.chainIds(destinationDoc);
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
  const sourceLineageIds = lineage.chainIds(sourceDoc.parent);
  const destinationLineageIds = lineage.chainIds(destinationDoc);
  const leavingLineage = sourceLineageIds.filter(id => !destinationLineageIds.includes(id));
  if (!leavingLineage.length) {
    return;
  }

  // The view carries each place's primary contact, so the whole docs never need reading. Kept behind
  // the early return above so a move within the same lineage costs no query at all.
  const result = await db.medic.query('medic/contacts_by_depth', {
    keys: leavingLineage.map(id => [ id, 0 ]),
  });
  const moved = new Set(descendantIds);
  const stranded = result.rows.find(row => moved.has(row.value.primary_contact));

  if (stranded) {
    throw new BadRequestError(
      `cannot move '${sourceDoc._id}': it would strand the primary contact of '${stranded.id}'`
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
};

module.exports = {
  assertMoveIsLegal,
};
