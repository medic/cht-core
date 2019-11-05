/**
 * @module rules-engine
 *
 * Business logic for interacting with rules documents
 */

const contactStateStore = require('./contact-state-store');
const rulesEmitter = require('./rules-emitter');
const taskFetcher = require('./task-fetcher');

module.exports = {
  initialize: taskFetcher.initialize,

  /**
   * @returns {Boolean} True if the rules engine is enabled and ready for use
   */
  isEnabled: () => rulesEmitter.isEnabled() && rulesEmitter.isLatestNoolsSchema(),

  fetchTasksFor: taskFetcher.fetchTasksFor,

  updateTasksFor: taskFetcher.updateTasksFor,

  /**
   * Determines if either the settings document or user's hydrated contact document have changed in a way which will impact the result of rules calculations.
   * If they have changed in a meaningful way, the calculation state of all contacts is reset
   *
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   * @param {Object} salt=1 Salt to add into the configuration hash. Changing this value invalidates the cache.
   */
  rulesConfigChange: (settingsDoc, userDoc, salt = 1) => {
    const cacheIsReset = contactStateStore.rulesConfigChange(settingsDoc, userDoc, salt);
    if (cacheIsReset) {
      rulesEmitter.shutdown();
    }
  },
};
