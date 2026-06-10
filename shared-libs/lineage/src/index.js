/**
 * @module lineage
 */
const summary = require('./summary');

const lineage = (Promise, DB) => Object.assign(
  {},
  require('./hydration')(Promise, DB),
  require('./minify')
);

// Pure summary helpers do not require a database, so they are exposed as static named exports
// rather than through the factory.
Object.assign(lineage, summary);

module.exports = lineage;
