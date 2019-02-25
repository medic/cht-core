const { UNIT_TEST_ENV } = process.env;

if (UNIT_TEST_ENV) {
  module.exports = {
    init: () => {},
    debug: () => {},
    warn: () => {},
    info: () => {},
    error: () => {}
  };
} else {
  module.exports.init = logger => {
    module.exports = Object.assign(module.exports, logger);
  };
}
