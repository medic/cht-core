/**
 * @module rules-engine
 *
 * Business logic for interacting with rules documents
 */

const contactStateStore = require('./contact-state-store');
const pouchdbProvider = require('./pouchdb-provider');
const rulesEmitter = require('./rules-emitter');
const taskFetcher = require('./task-fetcher');

module.exports = {
  /**
   * @param {Object} db Medic pouchdb database
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (db, settingsDoc, userDoc) => {
    const provider = pouchdbProvider(db);
    return taskFetcher.initialize(provider, settingsDoc, userDoc);
  },

  /**
   * @returns {Boolean} True if the rules engine is enabled and ready for use
   */
  isEnabled: () => rulesEmitter.isEnabled() && rulesEmitter.isLatestNoolsSchema(),

  /**
   * Refreshes all rules documents for a set of contacts and returns their task documents
   *
   * @param {Object} db Medic pouchdb database
   * @param {string[]} contactIds An array of contact ids. If undefined, all contacts are
   * @returns {Promise<Object[]>} All the fresh task docs owned by contactIds
   */
  fetchTasksFor: (db, contactIds) => {
    const provider = pouchdbProvider(db);
    return taskFetcher.fetchTasksFor(provider, contactIds);
  },

  /**
   * Indicate that the task documents associated with a given subjectId are dirty.
   * 
   * @param {Object} db Medic pouchdb database
   * @param {string[]} subjectIds An array of subject ids
   * 
   * @returns {Promise} To mark the subjectIds as dirty
   */
  updateTasksFor: (db, subjectIds) => {
    const provider = pouchdbProvider(db);
    return taskFetcher.updateTasksFor(provider, subjectIds);
  },

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
