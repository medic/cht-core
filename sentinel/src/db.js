const logger = require('@medic/logger');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const audit = require('@medic/audit');
const { wrapCouch, wrapMongo, initMongo } = require('@medic/db-adapter');

const { UNIT_TEST_ENV, DB_BACKEND, MONGO_URL } = process.env;
const isMongo = DB_BACKEND === 'mongodb';

if (UNIT_TEST_ENV) {
  const stubMe = functionName => () => {
    logger.error(
      new Error(
        `db.${functionName}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}. ` +
        `Please stub PouchDB functions that will be interacted with in unit tests.`
      )
    );
    process.exit(1);
  };

  module.exports.medic = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    remove: stubMe('remove'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
  };

  module.exports.sentinel = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
  };

  module.exports.users = {
    allDocs: stubMe('allDocs'),
    bulkDocs: stubMe('bulkDocs'),
    put: stubMe('put'),
    post: stubMe('post'),
    query: stubMe('query'),
    get: stubMe('get'),
    changes: stubMe('changes'),
  };

  module.exports.allDbs = stubMe('allDbs');
  module.exports.get = stubMe('get');
  module.exports.close = stubMe('close');
  module.exports.medicDbName = stubMe('medicDbName');
  module.exports.queryMedic = stubMe('queryMedic');
  module.exports.initMongoConnection = stubMe('initMongoConnection');
} else if (isMongo) {
  // --- MongoDB backend ---
  const service = 'sentinel';
  environment.setService(service);

  const mongoUrl = MONGO_URL || 'mongodb://localhost:27017';
  const dbName = environment.db || 'medic';

  module.exports.initMongoConnection = async () => {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(mongoUrl);
    await client.connect();
    initMongo(client);
    logger.info(`Sentinel connected to MongoDB at ${mongoUrl}`);

    module.exports.medic = wrapMongo(dbName);
    module.exports.sentinel = wrapMongo(`${dbName}-sentinel`);
    module.exports.users = wrapMongo(`${dbName}-users`);

    return client;
  };

  module.exports.allDbs = async () => {
    const { MongoClient: MC } = require('mongodb');
    const client = new MC(mongoUrl);
    try {
      await client.connect();
      const { databases } = await client.db().admin().listDatabases();
      return databases.map(db => db.name);
    } finally {
      await client.close();
    }
  };

  module.exports.get = name => wrapMongo(name);

  module.exports.close = db => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  };

  module.exports.medicDbName = environment.db || 'medic';

  // queryMedic for MongoDB — delegates to the adapter's query() method
  module.exports.queryMedic = async (viewPath, queryParams) => {
    if (viewPath === 'allDocs') {
      return module.exports.medic.allDocs(queryParams);
    }
    return module.exports.medic.query(viewPath, queryParams);
  };

} else {
  // --- CouchDB backend (existing behavior) ---
  const service = 'sentinel';
  environment.setService(service);

  const PouchDB = require('pouchdb-core');
  PouchDB.plugin(require('pouchdb-adapter-http'));
  PouchDB.plugin(require('pouchdb-mapreduce'));
  PouchDB.plugin(require('pouchdb-replication'));

  const couchUrl = environment.couchUrl;

  const fetchFn = (url, opts) => {
    opts.headers.set('X-Medic-Service', service);
    opts.headers.set('X-Medic-User', service);
    return PouchDB.fetch(url, opts).then(response => {
      void audit.fetchCallback(url, opts, response);
      return response;
    });
  };

  module.exports.medic = wrapCouch(new PouchDB(couchUrl, { fetch: fetchFn }));
  module.exports.sentinel = wrapCouch(new PouchDB(`${couchUrl}-sentinel`, { fetch: fetchFn}));
  module.exports.allDbs = () => request.get({ url: `${environment.serverUrl}/_all_dbs`, json: true });
  module.exports.get = db => wrapCouch(new PouchDB(`${environment.serverUrl}/${db}`));
  module.exports.close = db => {
    if (!db || db._destroyed || db._closed) {
      return;
    }
    try {
      db.close();
    } catch (err) {
      logger.error('Error when closing db: %o', err);
    }
  };
  module.exports.users = wrapCouch(new PouchDB(`${environment.serverUrl}/_users`, { fetch: fetchFn }));
  module.exports.queryMedic = (viewPath, queryParams, body) => {
    const [ddoc, view] = viewPath.split('/');
    const url = ddoc === 'allDocs' ? `${couchUrl}/_all_docs` : `${couchUrl}/_design/${ddoc}/_view/${view}`;
    const requestFn = body ? request.post : request.get;
    return requestFn({
      url,
      qs: queryParams,
      json: true,
      body,
    });
  };

  module.exports.initMongoConnection = async () => {};
}
