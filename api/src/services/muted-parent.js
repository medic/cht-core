const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const { findMutedAncestor } = require('@medic/transitions');
const auth = require('../auth');
const { PermissionError } = require('../errors');

const resolveParentId = (parentRef) => {
  if (!parentRef) {
    return null;
  }
  if (typeof parentRef === 'string') {
    return parentRef;
  }
  return parentRef._id || null;
};

const isParentMuted = async (parentRef) => {
  const parentId = resolveParentId(parentRef);
  if (!parentId) {
    return false;
  }
  const parent = await lineage.fetchHydratedDoc(parentId);
  if (!parent) {
    return false;
  }
  return Boolean(findMutedAncestor(parent));
};

const assertCanCreateOnMutedParent = async (userCtx, parentRef) => {
  if (await isParentMuted(parentRef)
    && !auth.hasAllPermissions(userCtx, 'can_create_contacts_under_muted_places')) {
    throw new PermissionError('Insufficient privileges to create contacts on muted places');
  }
};

module.exports = {
  isParentMuted,
  assertCanCreateOnMutedParent,
};
