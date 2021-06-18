module.exports = {
  'allow-uncaught': false,
  'async-only': false,
  color: true,
	spec: [
    'tests/integration/**/*.js',
    'tests/e2e/api/controllers/*.js',
  ],
  //ignore: ['tests/integration/api/routing.js'],
	timeout: 10000,
  reporter: 'spec',
  require: ['tests/integration/hooks.js'],
  captureFile: 'tests/results/results.txt'
  };