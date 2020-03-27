// TODO: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
const async = require('async');
const moment = require('moment');
const utils = require('../lib/utils');
const date = require('../date');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const messageUtils = require('@medic/message-utils');

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

const getTemplateContext = (doc, callback) => {
  const patientShortcodeId = doc.fields && doc.fields.patient_id;
  if (!patientShortcodeId) {
    return callback();
  }

  Promise
    .all([
      utils.getRegistrations({ id: patientShortcodeId }),
      getPatient(patientShortcodeId)
    ])
    .then(([ registrations, patient ]) => callback(null, { registrations, patient }))
    .catch(callback);
};

module.exports = {
  execute: callback => {
    const now = moment(date.getDate());
    const overdue = now.clone().subtract(7, 'days');

    db.medic.query(
      'medic/messages_by_state',
      {
        include_docs: true,
        endkey: [ 'scheduled', now.valueOf() ],
        startkey: [ 'scheduled', overdue.valueOf() ],
      },
      function(err, result) {
        if (err) {
          return callback(err);
        }

        const objs = result.rows.reduce((objs, row) => {
          if (!objs[row.id]) {
            row.dueDates = [];
            objs[row.id] = row;
          }
          objs[row.id].dueDates.push(moment(row.key[1]).toISOString());

          return objs;
        }, {});

        async.forEachSeries(
          objs,
          function(obj, cb) {
            lineage
              .hydrateDocs([obj.doc])
              .then(function(docs) {
                const doc = docs[0];
                getTemplateContext(doc, (err, context) => {
                  if (err) {
                    return cb(err);
                  }
                  let updatedTasks = false;
                  // set task to pending for gateway to pick up
                  doc.scheduled_tasks.forEach(task => {
                    if (obj.dueDates.includes(task.due)) {
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

                  if (!updatedTasks) {
                    return cb();
                  }

                  lineage.minify(doc);
                  db.medic.put(doc, cb);
                });
              })
              .catch(cb);
          },
          callback
        );
      }
    );
  },
  _lineage: lineage,
};
