/**
 * @module transitions
 */
const feed = require('./lib/feed');
const logger = require('@medic/logger');
const transitionsLib = require('./config').getTransitionsLib();

const loadTransitions = () => {
  try {
    transitionsLib.loadTransitions();
    feed.listen();
  } catch (e) {
    logger.error('Transitions are disabled until the above configuration errors are fixed.');
    feed.cancel();
  }
};

module.exports = {

  /**
   * Loads the transitions and starts watching for db changes.
   */
  loadTransitions: loadTransitions,

  // exposed for testing
  _transitionsLib: transitionsLib,
};
