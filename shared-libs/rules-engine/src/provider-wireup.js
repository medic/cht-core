/**
 * @module wireup
 *
 * Wireup a data provider to the rules-engine
 */

const moment = require('moment');
const registrationUtils = require('@medic/registration-utils');

const TaskStates = require('./task-states');
const refreshRulesEmissions = require('./refresh-rules-emissions');
const rulesEmitter = require('./rules-emitter');
const rulesStateStore = require('./rules-state-store');
const updateTemporalStates = require('./update-temporal-states');

let wireupOptions;

module.exports = {
  /**
   * @param {Object} provider A data provider
   * @param {Object} settings Settings for the behavior of the provider
   * @param {Object} settings.rules Rules code from settings doc
   * @param {Object[]} settings.taskSchedules Task schedules from settings doc
   * @param {Object[]} settings.targets Target definitions from settings doc
   * @param {Boolean} settings.enableTasks Flag to enable tasks
   * @param {Boolean} settings.enableTargets Flag to enable targets
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (provider, settings) => {
    const isEnabled = rulesEmitter.initialize(settings);
    if (!isEnabled) {
      return Promise.resolve();
    }

    const { enableTasks=true, enableTargets=true } = settings;
    wireupOptions = { enableTasks, enableTargets };

    return provider.existingRulesStateStore()
      .then(existingStateDoc => {
        if (!rulesEmitter.isLatestNoolsSchema()) {
          throw Error('Rules Engine: Updates to the nools schema are required');
        }

        const contactClosure = updatedState => provider.stateChangeCallback(
          existingStateDoc,
          { rulesStateStore: updatedState }
        );
        rulesStateStore.load(
          existingStateDoc.rulesStateStore,
          settings,
          contactClosure
        );
      });
  },

  /**
   * Refreshes the rules emissions for all contacts
   * Fetches all tasks in non-terminal state owned by the contacts
   * Updates the temporal states of the task documents
   * Commits those changes (async)
   *
   * @param {Object} provider A data provider
   * @param {string[]} contactIds An array of contact ids. If undefined, all task documents
   * @returns {Promise<Object[]>} All the fresh task docs owned by contacts
   */
  fetchTasksFor: (provider, contactIds) => {
    if (!rulesEmitter.isEnabled() || !wireupOptions.enableTasks) {
      return Promise.resolve([]);
    }

    const calculationTimestamp = Date.now();
    return refreshRulesEmissionForContacts(provider, calculationTimestamp, contactIds)
      .then(() => contactIds ? provider.tasksByRelation(contactIds, 'owner') : provider.allTasks('owner'))
      .then(tasksToDisplay => {
        const docsToCommit = updateTemporalStates(tasksToDisplay, calculationTimestamp);
        provider.commitTaskDocs(docsToCommit);
        return tasksToDisplay.filter(taskDoc => taskDoc.state === TaskStates.Ready);
      });
  },

  /**
   * Refreshes the rules emissions for all contacts
   *
   * @param {Object} provider A data provider
   * @param {Object} filterInterval Target emissions with date within the interval will be aggregated into the target
   *    scores
   * @param {Integer} filterInterval.start Start timestamp of interval
   * @param {Integer} filterInterval.end End timestamp of interval
   * @returns {Promise<Object>} The fresh aggregate target doc
   */
  fetchTargets: (provider, filterInterval) => {
    if (!rulesEmitter.isEnabled() || !wireupOptions.enableTargets) {
      return Promise.resolve([]);
    }

    const calculationTimestamp = Date.now();
    const createFilterFromInterval = interval => interval && (emission => {
      if (!emission.date) {
        return true;
      }

      const emissionDate = moment(emission.date);
      return emissionDate.isAfter(interval.start) && emissionDate.isBefore(interval.end);
    });

    return refreshRulesEmissionForContacts(provider, calculationTimestamp)
      .then(() => {
        if (filterInterval) {
          const previousFilterInterval = {
            start: moment(filterInterval.start).subtract(1, 'month').valueOf(),
            end: filterInterval.start - 1,
          };
          const previousEmissionFilter = createFilterFromInterval(previousFilterInterval);
          storeTargetsDoc(
            provider,
            () => rulesStateStore.aggregateStoredTargetEmissions(previousEmissionFilter),
            previousFilterInterval,
            true
          );
        }

        const targetEmissionFilter = createFilterFromInterval(filterInterval);
        const targets = rulesStateStore.aggregateStoredTargetEmissions(targetEmissionFilter);
        storeTargetsDoc(
          provider,
          () => targets,
          filterInterval,
          false
        );
        return targets;
      });
  },

  /**
   * Indicate that the rules emissions associated with a given subjectId are dirty
   *
   * @param {Object} provider A data provider
   * @param {string[]} subjectIds An array of subject ids
   *
   * @returns {Promise} To complete the transaction marking the subjectIds as dirty
   */
  updateEmissionsFor: (provider, subjectIds) => {
    if (subjectIds && !Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    // this function accepts subject ids, but rulesStateStore accepts a contact id, so a conversion is required
    return provider.contactsBySubjectId(subjectIds)
      .then(contactIds => rulesStateStore.markDirty(contactIds));
  },
};

const refreshRulesEmissionForContacts = (provider, calculationTimestamp, contactIds) => {
  const refreshAndSave = (freshData, updatedContactIds) => (
    refreshRulesEmissions(freshData, calculationTimestamp, wireupOptions)
      .then(refreshed => Promise.all([
        rulesStateStore.storeTargetEmissions(updatedContactIds, refreshed.targetEmissions),
        provider.commitTaskDocs(refreshed.updatedTaskDocs),
      ]))
  );

  const refreshForAllContacts = (calculationTimestamp) => (
    provider.allTaskData(rulesStateStore.currentUserSettings())
      .then(freshData => (
        refreshAndSave(freshData)
          .then(() => {
            const contactIds = freshData.contactDocs.map(doc => doc._id);

            const subjectIds = freshData.contactDocs.reduce((agg, contactDoc) => {
              registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
              return agg;
            }, new Set());

            const headlessSubjectIds = freshData.reportDocs
              .map(doc => registrationUtils.getSubjectId(doc))
              .filter(subjectId => !subjectIds.has(subjectId));

            rulesStateStore.markAllFresh(calculationTimestamp, [...contactIds, ...headlessSubjectIds]);
          })
      ))
  );

  const refreshForKnownContacts = (calculationTimestamp, contactIds) => {
    const dirtyContactIds = contactIds.filter(contactId => rulesStateStore.isDirty(contactId));
    return provider.taskDataFor(dirtyContactIds, rulesStateStore.currentUserSettings())
      .then(freshData => refreshAndSave(freshData, dirtyContactIds))
      .then(() => {
        rulesStateStore.markFresh(calculationTimestamp, dirtyContactIds);
      });
  };

  if (contactIds) {
    return refreshForKnownContacts(calculationTimestamp, contactIds);
  }

  // If the contact state store does not contain all contacts, build up that list (contact doc ids + headless ids in
  // reports/tasks)
  if (!rulesStateStore.hasAllContacts()) {
    return refreshForAllContacts(calculationTimestamp);
  }

  // Once the contact state store has all contacts, trust it and only refresh those marked dirty
  return refreshForKnownContacts(calculationTimestamp, rulesStateStore.getContactIds());
};

const storeTargetsDoc = (provider, calculateTargets, filterInterval, isSealed) => {
  const targetDocTag = filterInterval ? moment(filterInterval.end).format('YYYY-MM') : 'latest';
  const minifyTarget = target => ({ id: target.id, value: target.value });
  const calculateContent = () => ({
    targets: calculateTargets().map(minifyTarget),
    isSealed: !!isSealed,
  });

  return provider.commitTargetDoc(
    calculateContent,
    rulesStateStore.currentUserContact(),
    rulesStateStore.currentUserSettings(),
    targetDocTag
  );
};
