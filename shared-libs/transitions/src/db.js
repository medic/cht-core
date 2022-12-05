const logger = require('./lib/logger');
const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  const stubMe = functionName => () => {
    logger.error(new Error(
      `db.${functionName}() not stubbed!  UNIT_TEST_ENV=${UNIT_TEST_ENV}. ` +
      `Please stub PouchDB functions that will be interacted with in unit tests.`
    ));
    process.exit(1);
  };

  module.exports.couchUrl = stubMe('couchUrl');

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
    get: stubMe('get'),
  };
}

module.exports.init = db => module.exports = db;
