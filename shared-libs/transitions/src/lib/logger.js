const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  module.exports = {
    init: () => {},
    //debug: console.debug,
    debug: () => {},
    warn: console.warn,
    info: console.info,
    error: console.error
  };
} else {
  module.exports.init = logger => {
    module.exports = Object.assign(module.exports, logger);
  };
}
