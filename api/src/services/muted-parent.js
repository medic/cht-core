const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const auth = require('../auth');
const config = require('../config');
const { PermissionError } = require('../errors');

const resolveParentId = (parentRef) => {
  if (!parentRef) {
    return null;
  }
  if (typeof parentRef === 'string') {
    return parentRef;
  }
  const id = parentRef._id;
  // Only a string id is usable: PouchDB's encodeDocId calls id.startsWith, so anything else throws a
  // status-less TypeError that the 404 catch below cannot swallow, turning a 400 into a 500.
  return typeof id === 'string' && id ? id : null;
};

/**
 * Limitation: the gate only covers a parent reference that is a UUID string, or an object whose `_id`
 * is a string naming a document that already exists. It does NOT cover:
 *  - an inline parent object with no `_id`, or with a non string `_id` (a place the request is about to
 *    create), even when its own `parent` names a muted place;
 *  - an object carrying a client chosen `_id` that does not exist yet: the hydrated fetch 404s and a 404
 *    is treated as "not muted", leaving the missing parent to the create handler. What that handler then
 *    does differs by route:
 *      * POST /api/v1/places rejects with 400 unless the object passes `validatePlace`, which needs a
 *        `name` and a `type` that is a configured parent of the child's type; with those, the child is
 *        stored with `minifyLineage(parent)`, a dangling lineage reference.
 *      * POST /api/v1/people creates the `place` object with the supplied id under the same conditions,
 *        while a raw `parent` object (no `place`) is never validated and is stored verbatim, forged
 *        fields included.
 *      * POST /api/v1/places/:id hands the object to `getOrCreatePlace`, which creates it under its own
 *        `parent` and then re-parents the target place under the result, so a muted place one level up
 *        is not covered. Its inline `contact.place` behaves the same way, because `createPerson` also
 *        creates that place. This route is therefore gated only for a `parent`, or a `contact.place` or
 *        `contact.parent`, given as a UUID string or as an object with a string `_id`.
 * These shapes are only reachable through the legacy POST /api/v1/places, POST /api/v1/places/:id and
 * POST /api/v1/people routes; the v1 /person and /place validators reject any non string parent.
 */
const isParentMuted = async (parentRef) => {
  const parentId = resolveParentId(parentRef);
  if (!parentId) {
    return false;
  }
  let parent;
  try {
    parent = await lineage.fetchHydratedDoc(parentId);
  } catch (err) {
    // Defer to the underlying create handler so it produces its own error for missing parents.
    if (err?.status === 404 || err?.code === 404) {
      return false;
    }
    throw err;
  }
  if (!parent) {
    return false;
  }
  return Boolean(parent.muted || config.getTransitionsLib().isMutedInLineage(parent));
};

const assertCanCreateOnMutedParent = async (userCtx, parentRef) => {
  if (!parentRef || auth.hasAllPermissions(userCtx, 'can_create_contacts_under_muted_places')) {
    return;
  }
  if (await isParentMuted(parentRef)) {
    throw new PermissionError('Insufficient privileges to create contacts on muted places');
  }
};

module.exports = {
  isParentMuted,
  assertCanCreateOnMutedParent,
};
