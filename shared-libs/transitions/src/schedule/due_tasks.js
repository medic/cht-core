// TODO: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
const moment = require('moment');
const utils = require('../lib/utils');
const date = require('../date');
const config = require('../config');
const db = require('../db');
const rpn = require('request-promise-native');
const lineage = require('@medic/lineage')(Promise, db.medic);
const messageUtils = require('@medic/message-utils');

const BATCH_SIZE = 1000;

const getTemplateContext = (doc) => {
  const patientShortcodeId = doc.fields && doc.fields.patient_id;
  const placeShortcodeId = doc.fields && doc.fields.place_id;
  if (!patientShortcodeId && !placeShortcodeId) {
    return Promise.resolve();
  }

  return Promise
    .all([
      patientShortcodeId && utils.getRegistrations({ id: patientShortcodeId }),
      placeShortcodeId && utils.getRegistrations({ id: placeShortcodeId }),
    ])
    .then(([ patientRegistrations, placeRegistrations]) => ({
      registrations: patientRegistrations,
      placeRegistrations,
      // the doc is already hydrated
      patient: doc.patient,
      place: doc.place,
    }));
};

const updateScheduledTasks = (doc, context, dueDates) => {
  if (!doc) {
    return;
  }

  let updatedTasks = false;
  // set task to pending for gateway to pick up
  doc.scheduled_tasks.forEach(task => {
    // use the same due calculation as the `messages_by_state` view
    let due = task.due || task.timestamp || doc.reported_date;
    if (typeof due !== 'string') {
      due = moment(due).toISOString();
    }

    if (dueDates.includes(due)) {
      if (!task.messages) {
        const content = {
          translationKey: task.message_key,
          message: task.message,
        };

        const messages = messageUtils.generate(
          config.getAll(),
          utils.translate,
          doc,
          content,
          task.recipient,
          context
        );

        // generated messages could have errors, such messages should not be saved
        // an example invalid message would be generated when a registration was missing the patient
        if (!messageUtils.hasError(messages)) {
          task.messages = messages;
        }
      }

      // only update task states when messages exist
      if (task.messages) {
        updatedTasks = true;
        utils.setTaskState(task, 'pending');
      }
    }
  });

  return updatedTasks;
};

const getBatch = (query, startKey, startKeyDocId) => {
  const queryString = Object.assign({}, query);
  if (startKeyDocId) {
    queryString.startkey_docid = startKeyDocId;
    queryString.startkey = JSON.stringify(startKey);
  }

  const options = {
    baseUrl: db.couchUrl,
    uri: '/_design/medic/_view/messages_by_state',
    qs: queryString,
    json: true
  };

  let nextKey;
  let nextKeyDocId;

  return rpn
    .get(options)
    .then(result => {
      if (!result.rows || !result.rows.length) {
        return;
      }

      ({ key: nextKey, id: nextKeyDocId } = result.rows[result.rows.length - 1]);

      if (nextKeyDocId === startKeyDocId || nextKeyDocId === result.rows[0].id) {
        if (result.rows.length >= query.limit) {
          // queue is saturated with this single doc, double the limit for the next requests to get past it
          query.limit = query.limit * 2;
        } else {
          // this is the last doc, process it and there's no need to continue
          nextKeyDocId = null;
        }
      }

      const objs = {};
      result.rows.forEach(row => {
        if (!objs[row.id]) {
          row.dueDates = [];
          objs[row.id] = row;
        }
        objs[row.id].dueDates.push(moment(row.key[1]).toISOString());
      });

      let promiseChain = Promise.resolve();
      Object.values(objs).forEach(obj => {
        promiseChain = promiseChain
          .then(() => lineage.hydrateDocs([obj.doc]))
          .then(([doc]) => {
            return getTemplateContext(doc).then(context => {
              const hasUpdatedTasks = updateScheduledTasks(doc, context, obj.dueDates);
              if (!hasUpdatedTasks) {
                return;
              }

              lineage.minify(doc);
              return db.medic.put(doc);
            });
          });
      });

      return promiseChain;
    })
    .then(() => nextKeyDocId && getBatch(query, nextKey, nextKeyDocId));
};

module.exports = {
  execute: () => {
    const now = moment(date.getDate());
    const overdue = now.clone().subtract(7, 'days');
    const opts = {
      include_docs: true,
      endkey: JSON.stringify([ 'scheduled', now.valueOf() ]),
      startkey: JSON.stringify([ 'scheduled', overdue.valueOf() ]),
      limit: BATCH_SIZE,
    };

    return getBatch(opts);
  },
  _lineage: lineage,
};
