/* jshint ignore:start */
const globals = require('../../jest-test.config.js').globals;

module.exports = async () => {
  Object.entries(globals.test_env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};
/* jshint ignore:end */
