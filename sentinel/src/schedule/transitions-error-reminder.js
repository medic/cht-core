const logger = require('../lib/logger');
const transitionsLib = require('../config').getTransitionsLib();

module.exports = {
  execute: () => {
    const transitionLoadError = transitionsLib.getLoadingError();
    if (transitionLoadError) {
      logger.error('Transitions are disabled until these configuration errors are fixed.');
      logger.error(transitionLoadError);
    }
    
    return Promise.resolve();
  },
};
