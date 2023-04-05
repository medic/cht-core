const logger = require('../lib/logger');
const transitionsLib = require('../config').getTransitionsLib();

module.exports = {
  execute: () => {
    const transitionLoadError = transitionsLib.getLoadingError();
    if (transitionLoadError) {
      logger.error(`Transitions are disabled: ${JSON.stringify(transitionLoadError)}`);
    }

    return Promise.resolve();
  },
};
