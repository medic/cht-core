/**
 * @module rules-engine
 *
 * Business logic for interacting with rules documents
 */

const pouchdbProvider = require('./pouchdb-provider');
const rulesEmitter = require('./rules-emitter');
const rulesStateStore = require('./rules-state-store');
const wireupToProvider = require('./provider-wireup');

module.exports = {
  /**
   * @param {Object} db Medic pouchdb database
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   * @param {Object=} options Options for the behavior of the rules engine
   * @param {Boolean} options.enableTasks Flag to enable tasks
   * @param {Boolean} options.enableTargets Flag to enable targets
   */
  initialize: (db, settingsDoc, userDoc, options) => {
    const provider = pouchdbProvider(db);
    return wireupToProvider.initialize(provider, settingsDoc, userDoc, options);
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
    return wireupToProvider.fetchTasksFor(provider, contactIds);
  },

  /**
   * Refreshes all rules documents and returns the latest target document
   *
   * @param {Object} db Medic pouchdb database
   * @param {Function(emission)=} targetEmissionFilter Filter function to filter which target emissions should be aggregated
   * @example fetchTargets(db, emission => emission.date > moment().startOf('month'))
   * @returns {Promise<Object[]>} Array of fresh targets
   */
  fetchTargets: (db, targetEmissionFilter) => {
    const provider = pouchdbProvider(db);
    return wireupToProvider.fetchTargets(provider, targetEmissionFilter);
  },

  /**
   * Indicate that the task documents associated with a given subjectId are dirty.
   *
   * @param {Object} db Medic pouchdb database
   * @param {string[]} subjectIds An array of subject ids
   *
   * @returns {Promise} To mark the subjectIds as dirty
   */
  updateEmissionsFor: (db, subjectIds) => {
    const provider = pouchdbProvider(db);
    return wireupToProvider.updateEmissionsFor(provider, subjectIds);
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
    const cacheIsReset = rulesStateStore.rulesConfigChange(settingsDoc, userDoc, salt);
    if (cacheIsReset) {
      rulesEmitter.shutdown();
    }
  },
};
