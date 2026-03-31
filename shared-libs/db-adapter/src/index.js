const CouchAdapter = require('./couch/couch-adapter');
const logger = require('@medic/logger');

const BACKENDS = {
  couchdb: 'couchdb',
  // mongodb: 'mongodb',  // Future
};

const getBackend = () => {
  return process.env.DB_BACKEND || BACKENDS.couchdb;
};

/**
 * Wraps a PouchDB instance in a CouchAdapter.
 * This is the primary entry point for Phase 1 migration.
 *
 * @param {object} pouchDb - An already-constructed PouchDB instance
 * @returns {CouchAdapter} The wrapped adapter
 */
const wrapCouch = (pouchDb) => {
  return new CouchAdapter(pouchDb);
};

/**
 * Creates a database adapter for the configured backend.
 *
 * For 'couchdb' backend: requires a pre-constructed PouchDB instance.
 * Future backends (e.g. 'mongodb') will accept connection config instead.
 *
 * @param {object} pouchDbOrConfig - PouchDB instance (for couchdb) or config object (for future backends)
 * @returns {CouchAdapter} A database adapter instance
 */
const createAdapter = (pouchDbOrConfig) => {
  const backend = getBackend();

  if (backend === BACKENDS.couchdb) {
    return wrapCouch(pouchDbOrConfig);
  }

  logger.error(`Unsupported database backend: ${backend}`);
  throw new Error(`Unsupported database backend: ${backend}`);
};

module.exports = {
  createAdapter,
  wrapCouch,
  CouchAdapter,
  BACKENDS,
};
