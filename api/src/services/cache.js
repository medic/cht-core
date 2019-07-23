const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 5 * 60, // standard ttl in seconds for every generated cache element: 5 minutes
  checkperiod: 5 * 60, // period in seconds used for the automatic delete check interval: 5 minutes
  useClones: false
});

module.exports.cache = cache;
