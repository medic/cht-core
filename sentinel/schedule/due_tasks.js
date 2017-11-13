// TODO: this doesn't need to exist. We can just work this out dynamically when
//       gateway queries, it's not slow or complicated.
var async = require('async'),
    _ = require('underscore'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    date = require('../date'),
    config = require('../config'),
    messageUtils = require('../lib/message-utils');

const getTemplateContext = (db, doc, callback) => {
    const patientId = doc.fields && doc.fields.patient_id;
    if (!patientId) {
        return callback();
    }
    async.parallel({
        registrations: callback => utils.getRegistrations({ db: db, id: patientId }, callback),
        patient: callback => utils.getPatientContact(db, patientId, callback)
    }, callback);
};

module.exports = function(db, audit, callback) {
    var now = moment(date.getDate()),
        overdue = now.clone().subtract(7, 'days');

    db.medic.view('medic', 'due_tasks', {
        include_docs: true,
        endkey: now.toISOString(),
        startkey: overdue.toISOString()
    }, function(err, result) {

        if (err) {
            return callback(err);
        }

        var objs = _.unique(result.rows, false, function(row) {
            return row.id;
        });

        async.forEachSeries(objs, function(obj, cb) {
            const doc = obj.doc;
            getTemplateContext(db, doc, (err, context) => {
                if (err) {
                    return cb(err);
                }
                // set task to pending for gateway to pick up
                doc.scheduled_tasks.forEach(task => {
                    if (task.due === obj.key) {
                        utils.setTaskState(task, 'pending');
                        const content = {
                            translationKey: task.message_key,
                            message: task.message
                        };
                        task.messages = messageUtils.generate(
                            config.getAll(),
                            utils.translate,
                            doc,
                            content,
                            task.recipient,
                            context
                        );
                    }
                });
                audit.saveDoc(obj.doc, cb);
            });
        }, function(err) {
            callback(err);
        });

    });
};


