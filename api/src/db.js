const logger = require('@medic/logger');
const environment = require('@medic/environment');
const request = require('@medic/couch-request');
const { wrapCouch, wrapMongo, connectMongo } = require('@medic/db-adapter');

const { UNIT_TEST_ENV, DB_BACKEND, MONGO_URL } = process.env;
const isMongo = DB_BACKEND === 'mongodb';

// PouchDB at module level for rewire compatibility in tests
let PouchDB;
if (!UNIT_TEST_ENV && !isMongo) {
  PouchDB = require('pouchdb-core');
  PouchDB.plugin(require('pouchdb-adapter-http'));
  PouchDB.plugin(require('pouchdb-find'));
  PouchDB.plugin(require('pouchdb-mapreduce'));
}

if (UNIT_TEST_ENV) {
  const DBS_TO_STUB = [
    'medic',
    'users',
    'medicUsersMeta',
    'sentinel',
    'medicLogs',
    'builds',
    'vault',
    'cache',
  ];
  const DB_FUNCTIONS_TO_STUB = [
    'allDocs',
    'bulkDocs',
    'bulkGet',
    'put',
    'post',
    'query',
    'get',
    'getAttachment',
    'changes',
    'info',
    'close',
    'compact',
    'viewCleanup',
    'info',
    'destroy',
    'remove',
  ];
  const GLOBAL_FUNCTIONS_TO_STUB = [
    'get',
    'exists',
    'close',
    'allDbs',
    'activeTasks',
    'saveDocs',
    'createVault',
    'wipeCacheDb',
    'addRoleAsAdmin',
    'addRoleAsMember',
    'nouveauCleanup',
    'initMongoConnection',
  ];

  const notStubbed = (first, second) => {
    const name = second ? `${first}.${second}` : first;
    logger.error(new Error(
      `${name}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}. ` +
      `Please stub PouchDB functions that will be interacted with in unit tests.`
    ));
    process.exit(1);
  };

  DBS_TO_STUB.forEach(db => {
    module.exports[db] = {};
    DB_FUNCTIONS_TO_STUB.forEach(fn => {
      module.exports[db][fn] = () => notStubbed(db, fn);
    });
  });

  GLOBAL_FUNCTIONS_TO_STUB.forEach(fn => {
    module.exports[fn] = () => notStubbed(fn);
  });
} else if (isMongo) {
  // --- MongoDB backend ---
  const service = 'api';
  environment.setService(service);

  const mongoUrl = MONGO_URL || 'mongodb://localhost:27017';
  const dbName = environment.db || 'medic';

  // Create placeholder objects so modules that access db.medic at require time
  // (e.g., data-context.js) don't fail. These get replaced with real adapters
  // in initMongoConnection().
  const placeholder = { backendType: 'mongodb' };
  module.exports.medic = placeholder;
  module.exports.medicUsersMeta = placeholder;
  module.exports.medicLogs = placeholder;
  module.exports.sentinel = placeholder;
  module.exports.vault = placeholder;
  module.exports.users = placeholder;
  module.exports.builds = placeholder;
  module.exports.cache = placeholder;

  module.exports.initMongoConnection = async () => {
    const client = await connectMongo(mongoUrl);
    logger.info(`Connected to MongoDB at ${mongoUrl}`);

    module.exports.medic = wrapMongo(dbName);
    module.exports.medicUsersMeta = wrapMongo(`${dbName}-users-meta`);
    module.exports.medicLogs = wrapMongo(`${dbName}-logs`);
    module.exports.sentinel = wrapMongo(`${dbName}-sentinel`);
    module.exports.vault = wrapMongo(`${dbName}-vault`);
    module.exports.users = wrapMongo(`${dbName}-users`);
    module.exports.builds = wrapMongo(`${dbName}-builds`);
    module.exports.cache = wrapMongo(`${dbName}-cache`);

    // Ensure changelog indexes for each database
    await module.exports.medic.ensureIndexes();

    return client;
  };

  module.exports.createVault = () => module.exports.vault.info();

  module.exports.get = name => wrapMongo(name);

  module.exports.close = db => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  };

  module.exports.exists = async name => {
    try {
      const db = wrapMongo(name);
      await db.info();
      return db;
    } catch {
      return false;
    }
  };

  module.exports.allDbs = async () => {
    return [
      dbName, `${dbName}-sentinel`, `${dbName}-logs`,
      `${dbName}-users-meta`, `${dbName}-vault`, `${dbName}-users`,
    ];
  };

  module.exports.activeTasks = async () => [];

  module.exports.nouveauCleanup = async () => ({ ok: true });

  const saveDocs = async (db, docs) => {
    return db.bulkDocs(docs);
  };

  module.exports.saveDocs = async (db, docs) => {
    if (!db) {
      throw new Error('Invalid database to delete from: %o', db);
    }
    if (!docs.length) {
      return [];
    }
    const results = await saveDocs(db, docs);
    const errors = results
      .filter(result => result.error)
      .map(result => `saving ${result.id} failed with ${result.error}`);
    if (!errors.length) {
      return results;
    }
    throw new Error(`Error while saving docs: ${errors.join(', ')}`);
  };

  // No-ops for MongoDB — auth is handled at API layer
  module.exports.addRoleAsAdmin = async () => {};
  module.exports.addRoleAsMember = async () => {};

} else {
  // --- CouchDB backend (existing behavior) ---
  const asyncLocalStorage = require('./services/async-storage');
  const audit = require('@medic/audit');
  const { REQUEST_ID_HEADER } = require('./server-utils');

  const service = 'api';
  environment.setService(service);

  const fetchFn = (url, opts) => {
    opts.headers.set('X-Medic-Service', service);
    const requestMetadata = asyncLocalStorage.getRequest();
    if (requestMetadata.requestId) {
      opts.headers.set(REQUEST_ID_HEADER, requestMetadata.requestId);
    }
    return PouchDB.fetch(url, opts).then(response => {
      void audit.fetchCallback(url, opts, response, requestMetadata);
      return response;
    });
  };

  const DB = new PouchDB(environment.couchUrl, { fetch: fetchFn });
  const getDbUrl = name => `${environment.serverUrl}/${name}`;

  DB.setMaxListeners(0);
  module.exports.medic = wrapCouch(DB);
  module.exports.medicUsersMeta = wrapCouch(new PouchDB(`${environment.couchUrl}-users-meta`, { fetch: fetchFn }));
  module.exports.medicLogs = wrapCouch(new PouchDB(`${environment.couchUrl}-logs`, { fetch: fetchFn }));
  module.exports.sentinel = wrapCouch(new PouchDB(`${environment.couchUrl}-sentinel`, { fetch: fetchFn }));
  module.exports.vault = wrapCouch(new PouchDB(`${environment.couchUrl}-vault`, { fetch: fetchFn }));
  module.exports.createVault = () => module.exports.vault.info();
  module.exports.users = wrapCouch(new PouchDB(getDbUrl('_users'), { fetch: fetchFn }));
  module.exports.builds = wrapCouch(new PouchDB(environment.buildsUrl));

  module.exports.get = name => wrapCouch(new PouchDB(getDbUrl(name), { fetch: fetchFn }));
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

  module.exports.exists = name => {
    const pouchDb = new PouchDB(getDbUrl(name), { skip_setup: true, fetch: fetchFn });
    const db = wrapCouch(pouchDb);
    return db
      .info()
      .then(result => {
        if (result.error) {
          throw new Error(result.error);
        }
        return db;
      })
      .catch(() => {
        module.exports.close(db);
        return false;
      });
  };

  module.exports.allDbs = () => request.get({
    uri: `${environment.serverUrl}/_all_dbs`,
    json: true
  });

  module.exports.activeTasks = () => {
    return request
      .get({
        url: `${environment.serverUrl}/_active_tasks`,
        json: true
      })
      .then(tasks => tasks);
  };

  module.exports.nouveauCleanup = () => request.post({
    url: `${environment.couchUrl}/_nouveau_cleanup`,
    json: true,
  });

  const saveDocs = async (db, docs) => {
    try {
      return await db.bulkDocs(docs);
    } catch (err) {
      if (err.status !== 413 || docs.length === 1) {
        throw err;
      }
      const results = await Promise.all(docs.map(doc => db.put(doc)));
      return results.flat();
    }
  };

  module.exports.saveDocs = async (db, docs) => {
    if (!db) {
      throw new Error('Invalid database to delete from: %o', db);
    }
    if (!docs.length) {
      return [];
    }
    const results = await saveDocs(db, docs);
    const errors = results
      .filter(result => result.error)
      .map(result => `saving ${result.id} failed with ${result.error}`);
    if (!errors.length) {
      return results;
    }
    throw new Error(`Error while saving docs: ${errors.join(', ')}`);
  };

  const getDefaultSecurityStructure = () => ({
    names: [],
    roles: [],
  });

  const addRoleToSecurity = async (dbname, role, addAsAdmin) => {
    if (!dbname || !role) {
      throw new Error(`Cannot add security: invalid db name ${dbname} or role ${role}`);
    }
    const securityUrl = new URL(environment.serverUrl);
    securityUrl.pathname = `${dbname}/_security`;
    const securityObject = await request.get({ url: securityUrl.toString(), json: true });
    const property = addAsAdmin ? 'admins' : 'members';
    if (!securityObject[property]) {
      securityObject[property] = getDefaultSecurityStructure();
    }
    if (!securityObject[property].roles || !Array.isArray(securityObject[property].roles)) {
      securityObject[property].roles = [];
    }
    if (securityObject[property].roles.includes(role)) {
      return;
    }
    logger.info(`Adding "${role}" role to ${dbname} ${property}`);
    securityObject[property].roles.push(role);
    await request.put({ url: securityUrl.toString(), json: true, body: securityObject });
  };

  module.exports.addRoleAsAdmin = (dbname, role) => addRoleToSecurity(dbname, role, true);
  module.exports.addRoleAsMember = (dbname, role) => addRoleToSecurity(dbname, role, false);

  module.exports.initMongoConnection = async () => {};
}
