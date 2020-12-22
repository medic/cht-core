/**
 * @module rules-engine
 *
 * Business logic for interacting with rules documents
 */

const pouchdbProvider = require('./pouchdb-provider');
const rulesEmitter = require('./rules-emitter');
const rulesStateStore = require('./rules-state-store');
const wireupToProvider = require('./provider-wireup');

const NullFeedbackService = { submit: () => {} };

/**
 * @param {Object} db CHT pouchdb database
 * @param {Object} Feedback CHT Feedback service
 */
module.exports = (db, Feedback=NullFeedbackService) => {
  const provider = pouchdbProvider(db);
  return {
    /**
     * @param {Object} settings Settings for the behavior of the rules engine
     * @param {Object} settings.rules Rules code from settings doc
     * @param {Object[]} settings.taskSchedules Task schedules from settings doc
     * @param {Object[]} settings.targets Target definitions from settings doc
     * @param {Boolean} settings.enableTasks Flag to enable tasks
     * @param {Boolean} settings.enableTargets Flag to enable targets
     * @param {Object} settings.contact User's hydrated contact document
     * @param {Object} settings.user User's settings document
     */
    initialize: (settings) => wireupToProvider.initialize(provider, settings, Feedback),

    /**
     * @returns {Boolean} True if the rules engine is enabled and ready for use
     */
    isEnabled: () => rulesEmitter.isEnabled() && rulesEmitter.isLatestNoolsSchema(),

    /**
     * Refreshes all rules documents for a set of contacts and returns their task documents
     *
     * @param {string[]} contactIds An array of contact ids. If undefined, all contacts are
     * @returns {Promise<Object[]>} All the fresh task docs owned by contactIds
     */
    fetchTasksFor: contactIds => wireupToProvider.fetchTasksFor(provider, contactIds),

    /**
     * Refreshes all rules documents and returns the latest target document
     *
     * @param {Object} filterInterval Target emissions with date within the interval will be aggregated into the
     *   target scores
     * @param {Integer} filterInterval.start Start timestamp of interval
     * @param {Integer} filterInterval.end End timestamp of interval
     * @returns {Promise<Object[]>} Array of fresh targets
     */
    fetchTargets: filterInterval => wireupToProvider.fetchTargets(provider, filterInterval),

    /**
     * Indicate that the task documents associated with a given subjectId are dirty.
     *
     * @param {string[]} subjectIds An array of subject ids
     *
     * @returns {Promise} To mark the subjectIds as dirty
     */
    updateEmissionsFor: subjectIds => wireupToProvider.updateEmissionsFor(provider, subjectIds),

    /**
     * Determines if either the settings or user's hydrated contact document have changed in a way which will impact
     *   the result of rules calculations.
     * If they have changed in a meaningful way, the calculation state of all contacts is reset
     *
     * @param {Object} settings Updated settings
     * @param {Object} settings.rules Rules code from settings doc
     * @param {Object[]} settings.taskSchedules Task schedules from settings doc
     * @param {Object[]} settings.targets Target definitions from settings doc
     * @param {Boolean} settings.enableTasks Flag to enable tasks
     * @param {Boolean} settings.enableTargets Flag to enable targets
     * @param {Object} settings.contact User's hydrated contact document
     * @param {Object} settings.user User's user-settings document
     */
    rulesConfigChange: (settings) => {
      const cacheIsReset = rulesStateStore.rulesConfigChange(settings);
      if (cacheIsReset) {
        rulesEmitter.shutdown();
        rulesEmitter.initialize(settings, Feedback);
      }
    },

    /**
     * Returns a list of UUIDs of tracked contacts that are marked as dirty
     * @returns {Array} list of dirty contacts UUIDs
     */
    getDirtyContacts: () => rulesStateStore.getDirtyContacts(),
  };
};
