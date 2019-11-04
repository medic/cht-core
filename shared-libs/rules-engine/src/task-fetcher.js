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

const CONTACT_STATE_DOCID = '_local/taskState';

module.exports = {
  /**
   * @param {Object} db The medic PouchDB database
   * @param {Object} settingsDoc Settings document
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (db, settingsDoc, userDoc) => fetch.existingContactStateStore(db)
    .then(existingStateDoc => {
      if (!existingStateDoc) {
        existingStateDoc = { _id: CONTACT_STATE_DOCID };
      }

      const isEnabled = rulesEmitter.initialize(settingsDoc, userDoc);
      if (isEnabled) {
        if (!rulesEmitter.isLatestNoolsSchema()) {
          throw Error('Rules engine: Updates to the nools schema are required');
        }

        const closure = updatedState => stateChangeCallback(db, existingStateDoc, updatedState);
        contactStateStore.load(existingStateDoc.contactStateStore, settingsDoc, userDoc, closure);
      }
    }),

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
   * @param {Object} db The medic PouchDB database
   * @param {string[]} contactIds An array of contact ids. If undefined, all task documents
   * @returns {Promise<Object[]>} All the fresh task docs owned by contacts
   */
  fetchTasksFor: (db, contactIds) => {
    if (!rulesEmitter.isEnabled()) {
      return Promise.resolve([]);
    }

    const calculationTimestamp = Date.now();
    return refreshTasks(db, calculationTimestamp, contactIds)
      .then(() => contactIds ? fetch.tasksByRelation(db, contactIds, 'owner') : fetch.allTasks(db, 'owner'))
      .then(tasksToDisplay => {
        const docsToCommit = updateTemporalStates(tasksToDisplay, calculationTimestamp);
        commitTaskDocs(db, docsToCommit);
        return tasksToDisplay.filter(taskDoc => taskDoc.state === 'Ready');
      });
  },

  /**
   * Indicate that the task documents associated with a given subjectId are dirty.
   * 
   * @param {Object} db The medic PouchDB database
   * @param {string[]} subjectIds An array of subject ids
   * 
   * @returns {Promise} To complete the transaction marking the subjectIds as dirty
   */
  updateTasksFor: (db, subjectIds) => {
    if (subjectIds && !Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    // this function accepts subject ids, but contactStateStore accepts a contact id. attempt to lookup contact by reference */
    return db.query('medic-client/contacts_by_reference', { keys: subjectIds.map(key => ['shortcode', key]), include_docs: true })
      .then(results => {
        const shortcodeIds = results.rows.map(result => result.doc._id);
        const idsThatArentShortcodes = subjectIds.filter(id => !results.rows.map(row => row.key[1]).includes(id));

        return contactStateStore.markDirty([...shortcodeIds, ...idsThatArentShortcodes]);
      });
  },
};

const refreshTasks = (db, calculationTimestamp, contactIds) => {
  const refreshTasksForAllContacts = (db, calculationTimestamp) => fetch.allTaskData(db)
    .then(freshData => {
      return refreshTasksFor(freshData, calculationTimestamp)
        .then(docsToCommit => commitTaskDocs(db, docsToCommit))
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

  const refreshTasksForKnownContacts = (db, calculationTimestamp, contactIds) => {
    const dirtyContactIds = contactIds.filter(contactId => contactStateStore.isDirty(contactId));
    return fetch.taskDataFor(db, dirtyContactIds)
      .then(freshData => refreshTasksFor(freshData, calculationTimestamp))
      .then(docsToCommit => commitTaskDocs(db, docsToCommit))
      .then(() => {
        contactStateStore.markFresh(calculationTimestamp, dirtyContactIds);
      });
  };

  if (contactIds) {
    return refreshTasksForKnownContacts(db, calculationTimestamp, contactIds);
  }

  // If the contact state store does not contain all contacts, build up that list (contact doc ids + headless ids in reports/tasks)
  if (!contactStateStore.hasAllContacts()) {
    return refreshTasksForAllContacts(db, calculationTimestamp);
  }

  // Once the contact state store has all contacts, trust it and only refresh those marked dirty
  return refreshTasksForKnownContacts(db, calculationTimestamp, contactStateStore.getContactIds());
};

const docsOf = query => query.then(result => result.rows.map(row => row.doc).filter(existing => existing));
const fetch = {
  allTaskData: db => {
    const userDoc = contactStateStore.currentUser();
    const userContactId = userDoc && userDoc._id;
    return Promise.all([
        docsOf(db.query('medic-client/contacts_by_type', { include_docs: true })),
        docsOf(db.query('medic-client/reports_by_subject', { include_docs: true })),
        fetch.allTasks(db, 'requester'),
      ])
      .then(([contactDocs, reportDocs, taskDocs]) => ({ contactDocs, reportDocs, taskDocs, userContactId }));
  },

  /*
  PouchDB.query slows down when provided with a large keys array.
  For users with ~1000 users it is ~50x faster to provider a start/end key instead of specifying all ids
  */
  allTasks: (db, prefix) => docsOf(db.query('medic-client/tasks', { startkey: `${prefix}-`, endkey: `${prefix}-\ufff0`, include_docs: true })),

  existingContactStateStore: db => db.get(CONTACT_STATE_DOCID).catch(() => undefined),

  tasksByRelation: (db, contactIds, prefix) => {
    const keys = contactIds.map(contactId => `${prefix}-${contactId}`);
    return docsOf(db.query('medic-client/tasks', { keys, include_docs: true }));
  },

  taskDataFor: (db, contactIds) => {
    if (!contactIds || contactIds.length === 0) {
      return Promise.resolve({});
    }

    const userDoc = contactStateStore.currentUser();
    return docsOf(db.allDocs({ keys: contactIds, include_docs: true }))
      .then(contactDocs => {
        const subjectIds = contactDocs.reduce((agg, contactDoc) => {
          registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
          return agg;
        }, new Set(contactIds));

        return Promise.all([
            docsOf(db.query('medic-client/reports_by_subject', { keys: Array.from(subjectIds).map(key => [key]), include_docs: true })),
            fetch.tasksByRelation(db, contactIds, 'requester'),
          ])
          .then(([reportDocs, taskDocs]) => ({
            userContactId: userDoc && userDoc._id,
            contactDocs,
            reportDocs,
            taskDocs,
          }));
      });
  },
};

// previousCommit helps avoid conflict errors since these changes are handled asynchronously
let previousCommit = Promise.resolve();
const stateChangeCallback = (db, stateDoc, updatedState) => {
  Object.assign(stateDoc, { contactStateStore: updatedState });

  previousCommit = previousCommit
    .then(() => db.put(stateDoc))
    .then(updatedDoc => { stateDoc._rev = updatedDoc.rev; })
    .catch(err => console.error(`Error updating contactStateStore: ${err}`))
    .then(() => { previousCommit = Promise.resolve(); });

  return previousCommit;
};

const commitTaskDocs = (db, taskDocs) => {
  if (!taskDocs || taskDocs.length === 0) {
    return Promise.resolve([]);
  }

  console.log(`Committing ${taskDocs.length} task documents updates`);
  return db.bulkDocs(taskDocs)
    .catch(err => console.error('Error committing task documents', err));
};
