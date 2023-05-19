const logger = require('../lib/logger');
const transitionsLib = require('../config').getTransitionsLib();

module.exports = {
  execute: () => {
    const transitionLoadErrors = transitionsLib.getLoadingErrors();
    if (transitionLoadErrors && Array.isArray(transitionLoadErrors)) {
      const logMessage = ['Transitions are disabled', ...transitionLoadErrors].join('. ');
      logger.error(logMessage);
    }

    return Promise.resolve();
  },
};
