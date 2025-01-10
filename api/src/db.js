const PouchDB = require('pouchdb-core');
const logger = require('@medic/logger');
const environment = require('@medic/environment');
const request = require('@medic/couch-request');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-session-authentication'));
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const asyncLocalStorage = require('./services/async-storage');
const { REQUEST_ID_HEADER } = require('./server-utils');

const { UNIT_TEST_ENV } = process.env;

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
} else {
  const makeFetch = (promisedAuthHeaders) => async (url, opts) => {
    // Add Couch Proxy Auth headers
    Object
      .entries(await promisedAuthHeaders)
      .forEach(([name, value]) => opts.headers.set(name, value));

    // Adding audit flag (haproxy) Service that made the request initially.
    opts.headers.set('X-Medic-Service', 'api');
    const requestId = asyncLocalStorage.getRequestId();
    if (requestId) {
      opts.headers.set(REQUEST_ID_HEADER, requestId);
    }
    return PouchDB.fetch(url, opts);
  };
  const fetch = makeFetch(request.getAuthHeaders(environment.username));
  const adminFetch = makeFetch(request.getAuthHeaders(environment.username, '_admin'));

  const DB = new PouchDB(environment.couchUrl, { fetch });
  const getDbUrl = name => `${environment.serverUrl}/${name}`;

  DB.setMaxListeners(0);
  module.exports.medic = DB;
  module.exports.medicAsAdmin = new PouchDB(environment.couchUrl, { fetch: adminFetch });
  module.exports.medicUsersMeta = new PouchDB(`${environment.couchUrl}-users-meta`, { fetch });
  module.exports.medicLogs = new PouchDB(`${environment.couchUrl}-logs`, { fetch });
  module.exports.sentinel = new PouchDB(`${environment.couchUrl}-sentinel`, { fetch });
  module.exports.vault = new PouchDB(`${environment.couchUrl}-vault`, { fetch: adminFetch });
  module.exports.createVault = () => module.exports.vault.info();
  module.exports.users = new PouchDB(getDbUrl('_users'), { fetch: adminFetch });
  module.exports.builds = new PouchDB(environment.buildsUrl);

  // Get the DB with the given name
  module.exports.get = name => new PouchDB(getDbUrl(name), { fetch });
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

  // Resolves with the PouchDB object if the DB with the given name exists
  module.exports.exists = name => {
    const db = new PouchDB(getDbUrl(name), { skip_setup: true, fetch });
    return db
      .info()
      .then(result => {
        // In at least PouchDB 7.0.0, info() on a non-existent db doesn't throw,
        // instead it returns the error structure
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
      .then(tasks => {
        // TODO: consider how to filter these just to the active database.
        // On CouchDB 2.x you only get the shard name, which looks like:
        // shards/80000000-ffffffff/medic.1525076838
        // On CouchDB 1.x (I think) you just get the exact DB name
        return tasks;
      });
  };

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

  /**
   * @param {Database} db
   * @param {Array<DesignDocument>} docs
   * @return {[{ id: string, rev: string }]}
   */
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

  const addToSecurity = async (dbname, value, securityField) => {
    if (!dbname || !value) {
      throw new Error(`Cannot add security: invalid db name ${dbname} or ${securityField} ${value}`);
    }

    const securityUrl = new URL(environment.serverUrl);
    securityUrl.pathname = `${dbname}/_security`;

    const securityObject = await request.get({ url: securityUrl.toString(), json: true });

    if (!securityObject.members) {
      securityObject.members = getDefaultSecurityStructure();
    }

    if (!securityObject.members[securityField] || !Array.isArray(securityObject.members[securityField])) {
      securityObject.members[securityField] = [];
    }

    if (securityObject.members[securityField].includes(value)) {
      return;
    }

    logger.info(`Adding "${value}" role to ${dbname} members`);
    securityObject.members[securityField].push(value);
    await request.put({ url: securityUrl.toString(), json: true, body: securityObject });
  };

  module.exports.addUserAsMember = (dbname, name) => addToSecurity(dbname, name, 'names');
  module.exports.addRoleAsMember = (dbname, role) => addToSecurity(dbname, role, 'roles');
}
