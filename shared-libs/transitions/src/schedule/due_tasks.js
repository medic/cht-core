// TODO: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
const moment = require('moment');
const utils = require('../lib/utils');
const date = require('../date');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const messageUtils = require('@medic/message-utils');

const BATCH_SIZE = 1000;

const getPatient = (patientShortcodeId) => {
  return utils
    .getContactUuid(patientShortcodeId)
    .then(uuid => {
      if (!uuid) {
        return;
      }

      return lineage.fetchHydratedDoc(uuid);
    });
};

const getTemplateContext = (doc) => {
  const patientShortcodeId = doc.fields && doc.fields.patient_id;
  if (!patientShortcodeId) {
    return Promise.resolve();
  }

  return Promise
    .all([
      utils.getRegistrations({ id: patientShortcodeId }),
      getPatient(patientShortcodeId)
    ])
    .then(([ registrations, patient ]) => ({ registrations, patient }));
};

const updateScheduledTasks = (doc, context, dueDates) => {
  let updatedTasks = false;
  // set task to pending for gateway to pick up
  doc.scheduled_tasks.forEach(task => {
    if (dueDates.includes(task.due)) {
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

module.exports = {
  execute: callback => {
    const now = moment(date.getDate());
    const overdue = now.clone().subtract(7, 'days');
    const opts = {
      include_docs: true,
      endkey: [ 'scheduled', now.valueOf() ],
      startkey: [ 'scheduled', overdue.valueOf() ],
      limit: BATCH_SIZE,
    };

    return db.medic
      .query('medic/messages_by_state', opts)
      .then(result => {
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
          promiseChain = promiseChain.then(() => {
            return lineage.hydrateDocs([obj.doc]).then(([doc]) => {
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
        });

        return promiseChain;
      })
      .then(() => callback())
      .catch(callback);
  },
  _lineage: lineage,
};
