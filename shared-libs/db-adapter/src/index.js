const CouchAdapter = require('./couch/couch-adapter');
const MongoAdapter = require('./mongo/mongo-adapter');
const logger = require('@medic/logger');

const BACKENDS = {
  couchdb: 'couchdb',
  mongodb: 'mongodb',
};

let mongoClient = null;

const getBackend = () => {
  return process.env.DB_BACKEND || BACKENDS.couchdb;
};

/**
 * Wraps a PouchDB instance in a CouchAdapter.
 *
 * @param {object} pouchDb - An already-constructed PouchDB instance
 * @returns {CouchAdapter} The wrapped adapter
 */
const wrapCouch = (pouchDb) => {
  return new CouchAdapter(pouchDb);
};

/**
 * Creates a MongoAdapter for the given database name.
 * Requires MONGO_URL environment variable (e.g. 'mongodb://localhost:27017').
 *
 * @param {string} dbName - The database name
 * @param {string} [collectionName='docs'] - The collection name
 * @returns {MongoAdapter}
 */
const wrapMongo = (dbName, collectionName = 'docs') => {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized. Call initMongo() first.');
  }
  const db = mongoClient.db(dbName);
  const collection = db.collection(collectionName);
  return new MongoAdapter(collection, db, dbName);
};

/**
 * Initialize the shared MongoDB client connection.
 * Must be called before creating MongoDB adapters.
 *
 * @param {MongoClient} client - An already-connected MongoClient instance
 */
const initMongo = (client) => {
  mongoClient = client;
};

/**
 * Connect to MongoDB and initialize the shared client.
 * Handles MongoClient creation so callers don't need to import mongodb directly.
 *
 * @param {string} url - MongoDB connection URL
 * @returns {Promise<MongoClient>} The connected client
 */
const connectMongo = async (url) => {
  const { MongoClient } = require('mongodb');
  const connectUrl = url.includes('directConnection') ? url : `${url}/?directConnection=true`;
  const client = new MongoClient(connectUrl);
  await client.connect();
  initMongo(client);
  return client;
};

/**
 * Creates a database adapter for the configured backend.
 *
 * For 'couchdb': requires a pre-constructed PouchDB instance.
 * For 'mongodb': requires a database name string.
 *
 * @param {object|string} pouchDbOrDbName - PouchDB instance (couchdb) or database name string (mongodb)
 * @param {object} [opts] - Options
 * @param {string} [opts.collection] - MongoDB collection name (default: 'docs')
 * @returns {CouchAdapter|MongoAdapter}
 */
const createAdapter = (pouchDbOrDbName, opts = {}) => {
  const backend = getBackend();

  if (backend === BACKENDS.couchdb) {
    return wrapCouch(pouchDbOrDbName);
  }

  if (backend === BACKENDS.mongodb) {
    return wrapMongo(pouchDbOrDbName, opts.collection);
  }

  logger.error(`Unsupported database backend: ${backend}`);
  throw new Error(`Unsupported database backend: ${backend}`);
};

module.exports = {
  createAdapter,
  wrapCouch,
  wrapMongo,
  initMongo,
  connectMongo,
  CouchAdapter,
  MongoAdapter,
  BACKENDS,
};
