const logger = require('@medic/logger');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const audit = require('@medic/audit');

const { UNIT_TEST_ENV } = process.env;

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
} else {
  const PouchDB = require('pouchdb-core');
  PouchDB.plugin(require('pouchdb-adapter-http'));
  PouchDB.plugin(require('pouchdb-session-authentication'));
  PouchDB.plugin(require('pouchdb-mapreduce'));
  PouchDB.plugin(require('pouchdb-replication'));

  const couchUrl = environment.couchUrl;

  const fetchFn = (url, opts) => {
    // Adding audit flags (haproxy) Service and user that made the request initially.
    opts.headers.set('X-Medic-Service', 'sentinel');
    opts.headers.set('X-Medic-User', 'sentinel');
    return PouchDB.fetch(url, opts).then(response => {
      void audit.fetchCallback(url, opts, response);
      return response;
    });
  };

  module.exports.medic = new PouchDB(couchUrl, { fetch: fetchFn });
  module.exports.sentinel = new PouchDB(`${couchUrl}-sentinel`, {
    fetch: fetchFn,
  });
  module.exports.audit = new PouchDB(`${couchUrl}-audit`);
  audit.initLib(module.exports.medic, module.exports.audit, 'sentinel');
  request.setAudit(audit);

  module.exports.allDbs = () => request.get({ url: `${environment.serverUrl}/_all_dbs`, json: true });
  module.exports.get = db => new PouchDB(`${environment.serverUrl}/${db}`);
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
  module.exports.users = new PouchDB(`${environment.serverUrl}/_users`, { fetch: fetchFn });
  module.exports.users = new PouchDB(`${environment.serverUrl}/_users`);
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
}
