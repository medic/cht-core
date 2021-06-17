module.exports = {
  'allow-uncaught': false,
  'async-only': false,
	spec: ['tests/integration/**/*.js'],
  ignore: ['tests/integration/api/routing.js'],
	timeout: 135000,
  reporter: 'spec',
  require: ['tests/integration/hooks.js'],
  captureFile: 'tests/results/results.txt'
  };