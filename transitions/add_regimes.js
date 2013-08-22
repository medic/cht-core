var _ = require('underscore'),
    date = require('../date'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc, req) {
        // run the transition if there's a task_regimes array
        return Array.isArray(doc.task_regimes) && doc.task_regimes.some(function(regime) {
            // and *any* of the strings in it aren't in the list of scheduled_tasks
            return !doc.scheduled_tasks || (Array.isArray(doc.scheduled_tasks) && doc.scheduled_tasks.every(function(task) {
                return task.type !== regime;
            }));
        });
    },
    onMatch: function(change, db, callback) {
        callback(null, true);
    },
    addRegime: function(doc, key) {
        var regime,
            docStart,
            start,
            clinicContactName = utils.getClinicContactName(doc),
            clinicName = utils.getClinicName(doc);
            now = moment(date.getDate()),
            regimes = config.get('scheduled_reminder_regimes');



        docStart = doc[regime.start_from];

        // if the document does not have the `start_from` property (or its falsey) do nothing; this
        // will be rerun on next document change
        if (!docStart) {
            return false;
        }

        start = moment(docStart);

        _.each(regime.messages, function(msg) {
            utils.addScheduledMessage(doc, {
                message: i18n(msg.message, {
                    clinic_name: clinicName,
                    contact_name: clinicContactName,
                    patient_id: doc.patient_id,
                    serial_number: doc.serial_number
                }),
                group: msg.group,
                phone: doc.from,
                type: key
            });
        });
    }
};
