/**
 * @module lineage
 */
module.exports = (Promise, DB) => Object.assign(
  {},
  require('./hydration')(Promise, DB),
  require('./minify')
);
