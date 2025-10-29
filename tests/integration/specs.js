module.exports = {
  base: [],
  all: [
    'tests/integration/!(cht-conf|sentinel)/**/*.spec.js',
    'tests/integration/cht-conf/**/*.spec.js', // Executing last to not side-effect other tests.
  ],
  sentinel: [ 'tests/integration/sentinel/**/*.spec.js' ],
  replication: [
    'tests/integration/api/controllers/all-docs.spec.js',
    'tests/integration/api/controllers/bulk-docs.spec.js',
    'tests/integration/api/controllers/bulk-get.spec.js',
    'tests/integration/api/controllers/db-doc.spec.js',
    'tests/integration/api/controllers/replication.spec.js',
    'tests/integration/sentinel/schedules/purging.spec.js',
  ]
};
