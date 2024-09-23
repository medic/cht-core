process.env.COUCH_URL='http://admin:pass@localhost:5984/medic';

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: './api/tests/integration/**/*.js',
  timeout: 10000,
  reporter: 'spec',
};
