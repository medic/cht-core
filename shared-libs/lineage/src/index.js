/**
 * @module lineage
 */
module.exports = (Promise, DB, dataContext) => Object.assign(
  {},
  require('./hydration')(Promise, DB, dataContext),
  require('./minify')
);
