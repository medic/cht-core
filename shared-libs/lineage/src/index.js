/**
 * @module lineage
 */
module.exports = function(Promise, DB) {
  return Object.assign(
    {},
    require('./hydration')(Promise, DB),
    require('./minify')
  );
};
