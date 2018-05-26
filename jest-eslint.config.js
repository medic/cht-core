module.exports = {
  displayName: 'lint:eslint',
  runner: 'jest-runner-eslint',
  testMatch: [
    "<rootDir>/sentinel/tests/**/*.js",
    "<rootDir>/api/tests/mocha/**/*.js",
    '<rootDir>/webapp/tests/mocha/**/*.js'
  ],
  testPathIgnorePatterns: []
}
