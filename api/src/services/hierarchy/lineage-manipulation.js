const { replaceContactLineage, replaceParentLineage } = require('./replace-lineage');

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
  pluckIdsFromLineage,
  replaceParentLineage,
  replaceContactLineage,
};
