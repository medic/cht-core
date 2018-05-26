/* jshint ignore:start */
const globals = require('../../jest-test.config.js').globals;

module.exports = async() => {
  Object.entries(globals.test_env).forEach(([key, value]) => {
    const local_value = globals.local_env[key];
    if(local_value) {
      process.env[key] = local_value;
    }
  });
};
/* jshint ignore:end */
