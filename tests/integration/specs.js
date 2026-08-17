module.exports = {
  base: [],
  all: [
    'tests/integration/!(cht-conf|sentinel)/**/*.spec.js',
    'tests/integration/cht-conf/**/*.spec.js', // Executing last to not side-effect other tests.
  ],
  allIgnore: [
    // this test takes 60 seconds to complete., but the behavior reproduction is elaborate enough to keep the test code
    // this test only runs as part of the replication suite, which is not called in CI
    'tests/integration/api/controllers/replication-limit-log-abort.spec.js',
  ],
  sentinel: [ 'tests/integration/sentinel/**/*.spec.js' ],
  replication: [
    'tests/integration/api/controllers/all-docs.spec.js',
    'tests/integration/api/controllers/bulk-docs.spec.js',
    'tests/integration/api/controllers/bulk-get.spec.js',
    'tests/integration/api/controllers/db-doc.spec.js',
    'tests/integration/api/controllers/replication.spec.js',
    'tests/integration/api/controllers/replication-failure-log.spec.js',
    'tests/integration/api/controllers/replication-health.spec.js',
    'tests/integration/api/controllers/replication-limit-log.spec.js',
    'tests/integration/api/controllers/replication-limit-log-abort.spec.js',
  ],
  couchdb: [
    'tests/integration/couchdb/**/*.spec.js',
  ],
};
