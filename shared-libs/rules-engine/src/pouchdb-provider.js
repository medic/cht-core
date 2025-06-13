/**
 * @module pouchdb-provider
 *
 * Wireup for accessing rules document data via medic pouch db
 */

/* eslint-disable no-console */
const moment = require('moment');
const registrationUtils = require('@medic/registration-utils');
const uniqBy = require('lodash/uniqBy');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const dataContext = require('../../../api/src/services/data-context.js');

const RULES_STATE_DOCID = '_local/rulesStateStore';
const MAX_QUERY_KEYS = 500;

const docsOf = (query) => {
  return query.then(result => {
    const rows = uniqBy(result.rows, 'id');
    return rows.map(row => row.doc).filter(existing => existing);
  });
};

const rowsOf = (query) => query.then(result => uniqBy(result.rows, 'id'));

const medicPouchProvider = db => {
  const getContact = dataContext.bind(Contact.v1.get);
  const dbQuery = async (view, params) => {
    if (!params?.keys || params.keys.length < MAX_QUERY_KEYS) {
      return db.query(view, params);
    }

    const keys = new Set(params.keys);
    delete params.keys;
    const results = await db.query(view, params);
    const rows = results.rows.filter(row => keys.has(row.key));
    return { ...results, rows };
  };

  const self = {
    // PouchDB.query slows down when provided with a large keys array.
    // For users with ~1000 contacts it is ~50x faster to provider a start/end key instead of specifying all ids
    allTasks: prefix => {
      const options = { startkey: `${prefix}-`, endkey: `${prefix}-\ufff0`, include_docs: true };
      return docsOf(dbQuery('medic-client/tasks_by_contact', options));
    },

    allTaskData: userSettingsDoc => {
      const userSettingsId = userSettingsDoc?._id;
      return Promise.all([
        docsOf(dbQuery('medic-client/contacts_by_type', { include_docs: true })),
        docsOf(dbQuery('medic-client/reports_by_subject', { include_docs: true })),
        self.allTasks('requester'),
      ])
        .then(([contactDocs, reportDocs, taskDocs]) => ({ contactDocs, reportDocs, taskDocs, userSettingsId }));
    },

    contactsBySubjectId: async (subjectIds) => {
      const keys = subjectIds.map(key => ['shortcode', key]);
      const results = await db.query('medic-client/contacts_by_reference', { keys, include_docs: true });
      const shortcodeIds = results.rows.map(result => result.doc._id);
      const idsThatArentShortcodes = subjectIds.filter(id => !results.rows.map(row => row.key[1]).includes(id));
      return [...shortcodeIds, ...idsThatArentShortcodes];
    },

    stateChangeCallback: docUpdateClosure(db),

    commitTargetDoc: (targets, docTag, { userContactDoc, userSettingsDoc }, updatedTargets) => {
      const userContactId = userContactDoc?._id;
      const userSettingsId = userSettingsDoc?._id;
      const _id = `target~${docTag}~${userContactId}~${userSettingsId}`;

      return db
        .get(_id)
        .catch(err => {
          if (err.status === 404) {
            return {
              _id,
              type: 'target',
              user: userSettingsId,
              owner: userContactId,
              reporting_period: docTag,
            };
          }
          throw err;
        })
        .then(existingDoc => {
          if (!updatedTargets && existingDoc._rev) {
            return false;
          }

          existingDoc.targets = targets;
          existingDoc.updated_date = moment().startOf('day').valueOf();
          return db.put(existingDoc);
        });
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
      return docsOf(dbQuery( 'medic-client/tasks_by_contact', { keys, include_docs: true }));
    },

    allTaskRowsByOwner: (contactIds) => {
      const keys = contactIds.map(contactId => (['owner', 'all', contactId]));
      return rowsOf(dbQuery( 'medic-client/tasks_by_contact', { keys }));
    },

    allTaskRows: () => {
      const options = {
        startkey: ['owner', 'all'],
        endkey: ['owner', 'all', '\ufff0'],
      };

      return rowsOf(dbQuery( 'medic-client/tasks_by_contact', options));
    },

    taskDataFor: async (contactIds, userSettingsDoc) => {
      if (!contactIds || contactIds.length === 0) {
        return {};
      }
      
      const contactDocs = await Promise.all(
        contactIds.map(id => getContact(Qualifier.byUuid(id))
          .catch(err => {
            console.error(`Error fetching contact ${id}:`, err);
            return null;
          }))
      );

      const validContactDocs = contactDocs.filter(Boolean);
      const subjectIds = validContactDocs.reduce((agg, contactDoc) => {
        registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
        return agg;
      }, new Set(contactIds));

      const keys = Array.from(subjectIds);

      const [reportDocs, taskDocs] = await Promise.all([
        docsOf(dbQuery('medic-client/reports_by_subject', { keys, include_docs: true })),
        self.tasksByRelation(contactIds, 'requester'),
      ]);

      const relevantReportDocs = reportDocs.filter(report => {
        const subjectId = registrationUtils.getSubjectId(report);
        return subjectIds.has(subjectId);
      });

      return {
        userSettingsId: userSettingsDoc?._id,
        contactDocs: validContactDocs,
        reportDocs: relevantReportDocs,
        taskDocs,
      };
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
      .then(updatedDoc => (baseDoc._rev = updatedDoc.rev))
      .catch(err => console.error(`Error updating ${baseDoc._id}: ${err}`))
      .then(() => {
        // unsure of how browsers handle long promise chains, so break the chain when possible
        previousResult = Promise.resolve();
      });

    return previousResult;
  };
};

module.exports = medicPouchProvider;
