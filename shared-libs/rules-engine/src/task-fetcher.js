/**
 * @module task-fetcher
 *
 * Wireup connecting the medic pouch db to the rules-core
 */

const registrationUtils = require('@medic/registration-utils');

const contactStateStore = require('./contact-state-store');
const refreshTasksFor = require('./refresh-tasks-for-contacts');
const updateTemporalStates = require('./update-temporal-states');
const rulesEmitter = require('./rules-emitter');

module.exports = {
  /**
   * @param {DataProvider} provider A data provider
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (provider, settingsDoc, userDoc) => {
    return provider.existingContactStateStore()
      .then(existingStateDoc => {
        if (!existingStateDoc) {
          existingStateDoc = { _id: provider.CONTACT_STATE_DOCID };
        }

        const isEnabled = rulesEmitter.initialize(settingsDoc, userDoc);
        if (isEnabled) {
          if (!rulesEmitter.isLatestNoolsSchema()) {
            throw Error('Rules engine: Updates to the nools schema are required');
          }

          const closure = updatedState => provider.stateChangeCallback(existingStateDoc, updatedState);
          contactStateStore.load(existingStateDoc.contactStateStore, settingsDoc, userDoc, closure);
        }
      });
  },

  /**
   * Identifies the contacts whose task docs are not fresh
   * Fetches the needed data to refresh those contacts
   * Makes necessary updates to task documents (or new task documents)
   * Commits those document changes
   * Marks the dirty contacts as fresh (async)
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
    return refreshTasks(provider, calculationTimestamp, contactIds)
      .then(() => contactIds ? provider.tasksByRelation(contactIds, 'owner') : provider.allTasks('owner'))
      .then(tasksToDisplay => {
        const docsToCommit = updateTemporalStates(tasksToDisplay, calculationTimestamp);
        provider.commitTaskDocs(docsToCommit);
        return tasksToDisplay.filter(taskDoc => taskDoc.state === 'Ready');
      });
  },

  /**
   * Indicate that the task documents associated with a given subjectId are dirty.
   * 
   * @param {DataProvider} provider A data provider
   * @param {string[]} subjectIds An array of subject ids
   * 
   * @returns {Promise} To complete the transaction marking the subjectIds as dirty
   */
  updateTasksFor: (provider, subjectIds) => {
    if (subjectIds && !Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    // this function accepts subject ids, but contactStateStore accepts a contact id. attempt to lookup contact by reference
    return provider.contactsBySubjectId(subjectIds)
      .then(contactIds => contactStateStore.markDirty(contactIds));
  },
};

const refreshTasks = (provider, calculationTimestamp, contactIds) => {
  const refreshTasksForAllContacts = (calculationTimestamp) => provider.allTaskData(contactStateStore.currentUser())
    .then(freshData => {
      return refreshTasksFor(freshData, calculationTimestamp)
        .then(docsToCommit => provider.commitTaskDocs(docsToCommit))
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
        });
    });

  const refreshTasksForKnownContacts = (calculationTimestamp, contactIds) => {
    const dirtyContactIds = contactIds.filter(contactId => contactStateStore.isDirty(contactId));
    return provider.taskDataFor(dirtyContactIds, contactStateStore.currentUser())
      .then(freshData => refreshTasksFor(freshData, calculationTimestamp))
      .then(docsToCommit => provider.commitTaskDocs(docsToCommit))
      .then(() => {
        contactStateStore.markFresh(calculationTimestamp, dirtyContactIds);
      });
  };

  if (contactIds) {
    return refreshTasksForKnownContacts(calculationTimestamp, contactIds);
  }

  // If the contact state store does not contain all contacts, build up that list (contact doc ids + headless ids in reports/tasks)
  if (!contactStateStore.hasAllContacts()) {
    return refreshTasksForAllContacts(calculationTimestamp);
  }

  // Once the contact state store has all contacts, trust it and only refresh those marked dirty
  return refreshTasksForKnownContacts(calculationTimestamp, contactStateStore.getContactIds());
};
