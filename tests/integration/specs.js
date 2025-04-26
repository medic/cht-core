module.exports = {
  base: [],
  all: [
    // 'tests/integration/!(cht-conf|sentinel)/**/*.spec.js',
    // 'tests/integration/cht-conf/**/*.spec.js', // Executing last to not side-effect other tests.
    'tests/integration/api/controllers/login.spec.js'
  ],
  sentinel: [ 'tests/integration/sentinel/**/*.spec.js' ],
};
