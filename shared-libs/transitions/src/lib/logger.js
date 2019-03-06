const _ = require('underscore');
const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  module.exports = {
    debug: console.debug,
    warn: console.warn,
    info: console.info,
    error: console.error
  };
}

module.exports.init = logger => {
  Object.assign(module.exports, _.omit(logger, 'init'));
};
