module.exports = {
  displayName: 'jest:test',
  'testEnvironment': 'node',
  'globals': {
    'test_env': {
      'UNIT_TEST_ENV': true,
      'COUCH_URL': 'http://some:some@localhost:5999/some'
    },
    'local_env': process.env
  },
  "globalSetup": "<rootDir>/tests/mocha/setup.js",
  "globalTeardown": "<rootDir>/tests/mocha/teardown.js",
  'testMatch': [
    "<rootDir>/sentinel/tests/**/*.js",
    "<rootDir>/api/tests/mocha/**/*.js",
    '<rootDir>/webapp/tests/mocha/**/*.js'
  ],
  'collectCoverageFrom': [
    // yarn mochatests --coverage
    // Coverage makes sense against new development or a specific target
    // Update to cover your new test/function
    // '<rootDir>/**/*.{js}'
  ],
  'coverageThreshold': {
    'global': {
      'branches': 100,
      'functions': 100,
      'lines': 100,
      'statements': 100
    }
  },
  'testPathIgnorePatterns': [
    '<rootDir>/webapp/tests/mocha/unit/views/utils',
    '<rootDir>/webapp/tests/mocha/unit/mock-angular'
  ]
}
