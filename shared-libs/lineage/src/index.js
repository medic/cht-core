const lineage = {};

/**
 * @module lineage
 */
module.exports = (Promise, DB) => Object.assign(
  lineage,
  require('./hydration')(Promise, DB),
  require('./minify')
);
