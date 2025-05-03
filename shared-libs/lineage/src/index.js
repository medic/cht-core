/**
 * @module lineage
 */
module.exports = (Promise, DB, datasource) => Object.assign(
  {},
  require('./hydration')(Promise, DB, datasource),
  require('./minify')
);
