/**
 * Lineage manipulation helpers for hierarchy operations (move/merge).
 *
 * Ported from cht-conf `src/lib/hierarchy-operations/lineage-manipulation.js`, minus its
 * `minifyLineagesInDoc`: that function duplicates `@medic/lineage`'s `minify`, which is available
 * server-side, so callers should use `require('@medic/lineage')(Promise, db).minify` instead of
 * porting a copy. The remaining helpers (`createLineageFromDoc`, `pluckIdsFromLineage`) and the
 * re-exported `replace-lineage` functions have no shared-lib equivalent and are ported here.
 */

const { replaceContactLineage, replaceParentLineage } = require('./replace-lineage');

const createLineageFromDoc = doc => {
  if (!doc) {
    return undefined;
  }

  return {
    _id: doc._id,
    parent: doc.parent || undefined,
  };
};

/*
Given a lineage, return the ids therein
*/
const pluckIdsFromLineage = (lineage, results = []) => {
  if (!lineage) {
    return results;
  }

  return pluckIdsFromLineage(lineage.parent, [...results, lineage._id]);
};

module.exports = {
  createLineageFromDoc,
  pluckIdsFromLineage,
  replaceParentLineage,
  replaceContactLineage,
};
