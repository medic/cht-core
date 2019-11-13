/**
 * @module wireup
 *
 * Wireup a data provider to the rules-engine
 */

const registrationUtils = require('@medic/registration-utils');

const contactStateStore = require('./contact-state-store');
const targetEmissionStore = require('./target-emission-store');
const refreshRulesEmissions = require('./refresh-rules-emissions');
const updateTemporalStates = require('./update-temporal-states');
const rulesEmitter = require('./rules-emitter');

module.exports = {
  /**
   * @param {DataProvider} provider A data provider
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (provider, settingsDoc, userDoc) => {
    const isEnabled = rulesEmitter.initialize(settingsDoc, userDoc);
    if (!isEnabled) {
      return Promise.resolve();
    }
          
    return Promise.all([provider.existingContactStateStore(), provider.existingTargetEmissionStore()])
      .then(([existingStateDoc, existingTargetEmissionStore]) => {
        if (!rulesEmitter.isLatestNoolsSchema()) {
          throw Error('Rules Engine: Updates to the nools schema are required');
        }

        const contactClosure = updatedState => provider.contactStateChangeCallback(existingStateDoc, { contactStateStore: updatedState });
        contactStateStore.load(existingStateDoc.contactStateStore, settingsDoc, userDoc, contactClosure);

        const targetClosure = updatedState => provider.targetEmissionChangeCallback(existingTargetEmissionStore, { targetEmissions: updatedState });
        targetEmissionStore.load(existingTargetEmissionStore.targetEmissions, settingsDoc, targetClosure);
      });
  },

  /**
   * Refreshes the rules emissions for all contacts
   * Fetches all tasks in non-terminal state owned by the contacts
   * Updates the temporal states of the task documents
   * Commits those changes (async)
   *
   * @param {DataProvider} provider A data provider
   * @param {string[]} contactIds An array of contact ids. If undefined, all task documents
   * @returns {Promise<Object[]>} All the fresh task docs owned by contacts
   */
  fetchTasksFor: (provider, contactIds) => {
    if (!rulesEmitter.isEnabled()) {
      return Promise.resolve([]);
    }

    const calculationTimestamp = Date.now();
    return refreshRulesEmissionForContacts(provider, calculationTimestamp, contactIds)
      .then(() => contactIds ? provider.tasksByRelation(contactIds, 'owner') : provider.allTasks('owner'))
      .then(tasksToDisplay => {
        const docsToCommit = updateTemporalStates(tasksToDisplay, calculationTimestamp);
        provider.commitTaskDocs(docsToCommit);
        return tasksToDisplay.filter(taskDoc => taskDoc.state === 'Ready');
      });
  },

  /**
   * Refreshes the rules emissions for all contacts
   * 
   * @param {DataProvider} provider A data provider
   * @returns {Promise<Object>} The fresh aggregate target doc
   */
  fetchTargets: (provider, targetEmissionFilter) => {
    if (!rulesEmitter.isEnabled()) {
      return Promise.resolve([]);
    }

    const calculationTimestamp = Date.now();
    return refreshRulesEmissionForContacts(provider, calculationTimestamp)
      .then(() => {
        const targetModels = targetEmissionStore.getTargets(targetEmissionFilter);
        // provider.commitAggregatedTargets(aggregated, calculationTimestamp);
        return targetModels;
      });
  },

  /**
   * Indicate that the rules emissions associated with a given subjectId are dirty
   * 
   * @param {DataProvider} provider A data provider
   * @param {string[]} subjectIds An array of subject ids
   * 
   * @returns {Promise} To complete the transaction marking the subjectIds as dirty
   */
  updateEmissionsFor: (provider, subjectIds) => {
    if (subjectIds && !Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    // this function accepts subject ids, but contactStateStore accepts a contact id. attempt to lookup contact by reference
    return provider.contactsBySubjectId(subjectIds)
      .then(contactIds => contactStateStore.markDirty(contactIds));
  },
};

/**
 * Identifies the contacts whose task docs are not fresh
 * Fetches the needed data to refresh those contacts
 * Makes necessary updates to task documents (or new task documents)
 * Commits those document changes
 * Marks the dirty contacts as fresh (async)
 */
const refreshRulesEmissionForContacts = (provider, calculationTimestamp, contactIds) => {
  const refreshAndHandleRulesEmissions = (freshData, contactIds) => (
    refreshRulesEmissions(freshData, calculationTimestamp)
      .then(refreshed => Promise.all([
        targetEmissionStore.storeTargetEmissions(contactIds, refreshed.targetEmissions),
        provider.commitTaskDocs(refreshed.updatedTaskDocs),
      ]))
  );

  const refreshForAllContacts = (calculationTimestamp) => (
    provider.allTaskData(contactStateStore.currentUser())
      .then(freshData => (
        refreshAndHandleRulesEmissions(freshData)
          .then(() => {
            const contactIds = freshData.contactDocs.map(doc => doc._id);

            const subjectIds = freshData.contactDocs.reduce((agg, contactDoc) => {
              registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
              return agg;
            }, new Set());
            const headlessSubjectIds = freshData.reportDocs
              .map(doc => registrationUtils.getPatientId(doc))
              .filter(patientId => !subjectIds.has(patientId));

            contactStateStore.markAllFresh(calculationTimestamp, [...contactIds, ...headlessSubjectIds]);
          })
      ))
  );

  const refreshForKnownContacts = (calculationTimestamp, contactIds) => {
    const dirtyContactIds = contactIds.filter(contactId => contactStateStore.isDirty(contactId));
    return provider.taskDataFor(dirtyContactIds, contactStateStore.currentUser())
      .then(freshData => refreshAndHandleRulesEmissions(freshData, contactIds))
      .then(() => {
        contactStateStore.markFresh(calculationTimestamp, dirtyContactIds);
      });
  };

  if (contactIds) {
    return refreshForKnownContacts(calculationTimestamp, contactIds);
  }

  // If the contact state store does not contain all contacts, build up that list (contact doc ids + headless ids in reports/tasks)
  if (!contactStateStore.hasAllContacts()) {
    return refreshForAllContacts(calculationTimestamp);
  }

  // Once the contact state store has all contacts, trust it and only refresh those marked dirty
  return refreshForKnownContacts(calculationTimestamp, contactStateStore.getContactIds());
};
