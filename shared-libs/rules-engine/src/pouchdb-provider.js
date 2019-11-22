/**
 * @module pouchdb-provider
 *
 * Wireup for accessing rules document data via medic pouch db
 */

const registrationUtils = require('@medic/registration-utils');

const RULES_STATE_DOCID = '_local/rulesStateStore';
const docsOf = query => query.then(result => result.rows.map(row => row.doc).filter(existing => existing));

const medicPouchProvider = db => {

  // commitTargetDocClosures avoids conflict errors when used asynchronously
  const commitTargetDocClosures = {};
  const self = {
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

    stateChangeCallback: docUpdateClosure(db),

    commitTargetDoc: (assign, userDoc, docTag) => {
      const userContactId = userDoc && userDoc._id;
      const _id = `target-${docTag}-${userContactId}`;
      if (!commitTargetDocClosures[_id]) {
        const createNew = () => ({
          _id,
          type: 'target',
          user: userContactId,
        });

        return db.get(_id)
          .catch(createNew)
          .then(existingDoc => {
            const closure = docUpdateClosure(db);
            commitTargetDocClosures[_id] = doc => closure(existingDoc, doc);
            return commitTargetDocClosures[_id](assign);
          });
      }

      return commitTargetDocClosures[_id](assign);
    },

    commitTaskDocs: taskDocs => {
      if (!taskDocs || taskDocs.length === 0) {
        return Promise.resolve([]);
      }
   
      console.debug(`Committing ${taskDocs.length} task document updates`);
      return db.bulkDocs(taskDocs)
        .catch(err => console.error('Error committing task documents', err));
    },

    existingRulesStateStore: () => db.get(RULES_STATE_DOCID).catch(() => ({ _id: RULES_STATE_DOCID })),

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

medicPouchProvider.RULES_STATE_DOCID = RULES_STATE_DOCID;

const docUpdateClosure = db => {
  // previousResult helps avoid conflict errors if this functions is used asynchronously
  let previousResult = Promise.resolve();
  return (baseDoc, assigned) => {
    Object.assign(baseDoc, assigned);

    previousResult = previousResult
      .then(() => db.put(baseDoc))
      .then(updatedDoc => { baseDoc._rev = updatedDoc.rev; })
      .catch(err => console.error(`Error updating ${baseDoc._id}: ${err}`))
      .then(() => {
        // unsure of how browsers handle long promise chains, so break the chain when possible
        previousResult = Promise.resolve();
      });

    return previousResult;
  };
};

module.exports = medicPouchProvider;
