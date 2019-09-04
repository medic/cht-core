/**
 * @module lineage
 */
module.exports = function(Promise, DB) {
  return Object.assign(
    {},
    require('./lineage')(Promise, DB),
    require('./minify')
  );
};
