const PouchDB = require('pouchdb-core');
const logger = require('./logger');
const environment = require('./environment');
const rpn = require('request-promise-native');
const _ = require('lodash');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-mapreduce'));

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
  ];
  const GLOBAL_FUNCTIONS_TO_STUB = [
    'get',
    'exists',
    'close',
    'allDbs',
    'activeTasks',
    'saveDocs',
    'createVault'
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
  const fetch = (url, opts) => {
    // Adding audit flag (haproxy) Service that made the request initially.
    opts.headers.set('X-Medic-Service', 'api');
    return PouchDB.fetch(url, opts);
  };

  const DB = new PouchDB(environment.couchUrl, { fetch });
  const getDbUrl = name => `${environment.serverUrl}/${name}`;

  DB.setMaxListeners(0);
  module.exports.medic = DB;
  module.exports.medicUsersMeta = new PouchDB(`${environment.couchUrl}-users-meta`, { fetch });
  module.exports.medicLogs = new PouchDB(`${environment.couchUrl}-logs`, { fetch });
  module.exports.sentinel = new PouchDB(`${environment.couchUrl}-sentinel`, { fetch });
  module.exports.vault = new PouchDB(`${environment.couchUrl}-vault`, { fetch });
  module.exports.createVault = () => module.exports.vault.info();
  module.exports.users = new PouchDB(getDbUrl('/_users'), { fetch });
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

  module.exports.allDbs = () => rpn.get({
    uri: `${environment.serverUrl}/_all_dbs`,
    json: true
  });

  module.exports.activeTasks = () => {
    return rpn
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

    let results;
    try {
      results = await db.bulkDocs(docs);
    } catch (err) {
      if (err.status !== 413 || docs.length === 1) {
        throw err;
      }

      results = await Promise.all(docs.map(doc => db.put(doc)));
      results = results.flat();
    }

    const errors = results
      .filter(result => result.error)
      .map(result => `saving ${result.id} failed with ${result.error}`);

    if (!errors.length) {
      return results;
    }

    throw new Error(`Error while saving docs: ${errors.join(', ')}`);
  };
}
