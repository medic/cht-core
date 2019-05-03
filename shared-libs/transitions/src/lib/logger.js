const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  module.exports = {
    init: () => {},
    debug: console.debug,
    warn: console.warn,
    info: console.info,
    error: console.error
  };
}

module.exports.init = logger => module.exports = logger;
