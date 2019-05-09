const PouchDB = require('pouchdb-core'),
  logger = require('./logger'),
  environment = require('./environment');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-find'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  const DBS_TO_STUB = [
    'medic',
    'users',
    'medicUsersMeta'
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
  ];
  const GLOBAL_FUNCTIONS_TO_STUB = [
    'get',
    'exists'
  ];

  const notStubbed = (first, second) => {
    const name = second ? `${first}.${second}` : first;
    logger.error(new Error(`${name}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}.  Please stub PouchDB functions that will be interacted with in unit tests.`));
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
  const DB = new PouchDB(environment.couchUrl, {
    fetch: (url, opts) => {
      opts.headers.set('X-Medic-Service', 'api');
      return PouchDB.fetch(url, opts);
    },
  });
  const DBUsersMeta = new PouchDB(`${environment.couchUrl}-users-meta`, {
    fetch: (url, opts) => {
      opts.headers.set('X-Medic-Service', 'api');
      return PouchDB.fetch(url, opts);
    },
  });
  const getDbUrl = name => `${environment.serverUrl}/${name}`;
  DB.setMaxListeners(0);
  module.exports.medic = DB;
  module.exports.medicUsersMeta = DBUsersMeta;
  module.exports.sentinel = new PouchDB(`${environment.couchUrl}-sentinel`);
  module.exports.users = new PouchDB(getDbUrl('/_users'));

  // Get the DB with the given name
  module.exports.get = name => new PouchDB(getDbUrl(name));

  // Resolves true if the DB with the given name exists
  module.exports.exists = name => {
    const db = new PouchDB(getDbUrl(name), { skip_setup: true });
    return db.info()
      .then(result => {
        // In at least PouchDB 7.0.0, info() on a non-existant db doesn't throw,
        // instead it returns the error structure
        return  !result.error;
      })
      .catch(() => false);
  };
}
