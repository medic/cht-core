const NodeCache = require('node-cache');

const defaultOpts = {
  stdTTL: 5 * 60, // standard ttl in seconds for every generated cache element: 5 minutes
  checkperiod: 5 * 60, // period in seconds used for the automatic delete check interval: 5 minutes
  useClones: false
};

const caches = new Map();
module.exports.instance = (name, opts = {}) => {
  if (!caches.has(name)) {
    const options = Object.assign({}, defaultOpts, opts);
    caches.set(name, new NodeCache(options));
  }
  return caches.get(name);
};

module.exports.clear = (name) => {
  if (!caches.has(name)) {
    return;
  }
  caches.get(name).flushAll();
  caches.delete(name);
};

