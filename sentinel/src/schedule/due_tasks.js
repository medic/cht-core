// TODO: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
const async = require('async'),
  _ = require('underscore'),
  moment = require('moment'),
  utils = require('../lib/utils'),
  date = require('../date'),
  config = require('../config'),
  dbPouch = require('../db-pouch'),
  lineage = require('@medic/lineage')(Promise, dbPouch.medic),
  messageUtils = require('@medic/message-utils');

const getPatient = (db, patientShortcodeId, callback) => {
  utils.getPatientContactUuid(db, patientShortcodeId, (err, uuid) => {
    if (err || !uuid) {
      return callback(err);
    }
    lineage.fetchHydratedDoc(uuid, callback);
  });
};

const getTemplateContext = (db, doc, callback) => {
  const patientShortcodeId = doc.fields && doc.fields.patient_id;
  if (!patientShortcodeId) {
    return callback();
  }
  async.parallel(
    {
      registrations: callback =>
        utils.getRegistrations({ db: db, id: patientShortcodeId }, callback),
      patient: callback => getPatient(db, patientShortcodeId, callback),
    },
    callback
  );
};

module.exports = {
  execute: function(db, callback) {
    var now = moment(date.getDate()),
      overdue = now.clone().subtract(7, 'days');

    db.medic.view(
      'medic',
      'due_tasks',
      {
        include_docs: true,
        endkey: now.toISOString(),
        startkey: overdue.toISOString(),
      },
      function(err, result) {
        if (err) {
          return callback(err);
        }

        var objs = _.unique(result.rows, false, function(row) {
          return row.id;
        });

        async.forEachSeries(
          objs,
          function(obj, cb) {
            lineage
              .hydrateDocs([obj.doc])
              .then(function(docs) {
                const doc = docs[0];
                getTemplateContext(db, doc, (err, context) => {
                  if (err) {
                    return cb(err);
                  }
                  var updatedTasks = false;
                  // set task to pending for gateway to pick up
                  doc.scheduled_tasks.forEach(task => {
                    if (task.due === obj.key) {
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
                  dbPouch.medic.put(doc, cb);
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
