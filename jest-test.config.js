module.exports = {
  displayName: 'jest:test',
  'testEnvironment': 'node',
  'testMatch': [
    "<rootDir>/sentinel/tests/**/*.js",
    "<rootDir>/api/tests/mocha/**/*.js",
    '<rootDir>/webapp/tests/mocha/**/*.js'
  ],
  'collectCoverageFrom': [
    '<rootDir>/**/*.{js}'
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
