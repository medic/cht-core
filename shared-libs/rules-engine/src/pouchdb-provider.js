/**
 * @module pouchdb-provider
 *
 * Wireup for accessing rules document data via medic pouch db
 */

const registrationUtils = require('@medic/registration-utils');

const CONTACT_STATE_DOCID = '_local/taskState';

// previousStateChangeResult helps avoid conflict errors since these changes are handled asynchronously
let previousStateChangeResult = Promise.resolve();

const docsOf = query => query.then(result => result.rows.map(row => row.doc).filter(existing => existing));

const medicPouchProvider = db => {
  const self = {
    CONTACT_STATE_DOCID,

    /*
    PouchDB.query slows down when provided with a large keys array.
    For users with ~1000 contacts it is ~50x faster to provider a start/end key instead of specifying all ids
    */
    allTasks: prefix => {
      const options = { startkey: `${prefix}-`, endkey: `${prefix}-\ufff0`, include_docs: true };
      return docsOf(db.query('medic-client/tasks', options));
    },

    allTaskData: userDoc => {
      const userContactId = userDoc && userDoc._id;
      return Promise.all([
          docsOf(db.query('medic-client/contacts_by_type', { include_docs: true })),
          docsOf(db.query('medic-client/reports_by_subject', { include_docs: true })),
          self.allTasks('requester'),
        ])
        .then(([contactDocs, reportDocs, taskDocs]) => ({ contactDocs, reportDocs, taskDocs, userContactId }));
    },

    contactsBySubjectId: subjectIds => (
      db.query('medic-client/contacts_by_reference', { keys: subjectIds.map(key => ['shortcode', key]), include_docs: true })
        .then(results => {
          const shortcodeIds = results.rows.map(result => result.doc._id);
          const idsThatArentShortcodes = subjectIds.filter(id => !results.rows.map(row => row.key[1]).includes(id));

          return [...shortcodeIds, ...idsThatArentShortcodes];
        })
    ),

    commitTaskDocs: taskDocs => {
      if (!taskDocs || taskDocs.length === 0) {
        return Promise.resolve([]);
      }
    
      console.debug(`Committing ${taskDocs.length} task document updates`);
      return db.bulkDocs(taskDocs)
        .catch(err => console.error('Error committing task documents', err));
    },

    existingContactStateStore: () => db.get(CONTACT_STATE_DOCID).catch(() => undefined),

    stateChangeCallback: (stateDoc, updatedState) => {
      Object.assign(stateDoc, { contactStateStore: updatedState });

      previousStateChangeResult = previousStateChangeResult
        .then(() => db.put(stateDoc))
        .then(updatedDoc => { stateDoc._rev = updatedDoc.rev; })
        .catch(err => console.error(`Error updating contactStateStore: ${err}`))
        .then(() => {
          // unsure of how browsers handle long promise chains, so break the chain when possible
          previousStateChangeResult = Promise.resolve();
        });

      return previousStateChangeResult;
    },

    tasksByRelation: (contactIds, prefix) => {
      const keys = contactIds.map(contactId => `${prefix}-${contactId}`);
      return docsOf(db.query('medic-client/tasks', { keys, include_docs: true }));
    },

    taskDataFor: (contactIds, userDoc) => {
      if (!contactIds || contactIds.length === 0) {
        return Promise.resolve({});
      }

      return docsOf(db.allDocs({ keys: contactIds, include_docs: true }))
        .then(contactDocs => {
          const subjectIds = contactDocs.reduce((agg, contactDoc) => {
            registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
            return agg;
          }, new Set(contactIds));
          
          const keys = Array.from(subjectIds).map(key => [key]);
          return Promise.all([
              docsOf(db.query('medic-client/reports_by_subject', { keys, include_docs: true })),
              self.tasksByRelation(contactIds, 'requester'),
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

  return self;
};

module.exports = medicPouchProvider;
