var _ = require('underscore'),
    config = require('../config'),
    date = require('../date'),
    i18n = require('../i18n'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var clinicContactName,
            clinicPhone,
            doc = change.doc,
            reportedDate,
            self = module.exports;

        clinicPhone = utils.getClinicPhone(doc);
        clinicContactName = utils.getClinicContactName(doc);

        if (date.isSynthetic()) {
            reportedDate = moment(date.getDate());
        } else {
            reportedDate = moment(doc.reported_date);
        }
        reportedDate.startOf('day');

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var birthDate,
                parentPhone = utils.getParentPhone(registration),
                msg = "No patient with id '{{patient_id}}' found.";

            if (err) {
                return callback(err);
            }
            if (!registration) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n(msg, {patient_id: doc.patient_id})
                });
                return callback(null, true);
            }

            _.extend(registration, {
                mother_outcome: doc.outcome_mother,
                child_outcome: doc.outcome_child,
                child_birth_weight: doc.birth_weight,
                child_birth_date: reportedDate.subtract('days', doc.days_since_delivery).valueOf()
            });

            utils.clearScheduledMessages(
                registration, 'anc_visit', 'miso_reminder', 'upcoming_delivery',
                'outcome_request'
            );

            msg = "Thank you, {{contact_name}}. Birth outcome report for"
                + " {{serial_number}} has been recorded.";

            var msg_lbw = "Thank you, {{contact_name}}. Birth outcome report"
                + " for {{serial_number}} has been recorded. The Baby"
                + " is LBW. Please refer the mother and baby to"
                + " the health post immediately.";

            var msg_lbw = "Thank you, {{contact_name}}. Birth outcome report"
                + " for {{serial_number}} has been recorded. The Baby is LBW."
                + " Please refer the mother and baby to the health post immediately.";

            var msg_sick_child = "Thank you, {{contact_name}}. Birth outcome report for"
                + " {{serial_number}} has been recorded. If danger sign,"
                + " please call health worker immediately and fill in"
                + " the emergency report.";

            if (doc.outcome_child === 'Alive and Sick') {
                msg = msg_sick_child;
            }
            if (doc.birth_weight === 'Green') {
                utils.clearScheduledMessages(
                    registration, 'counseling_reminder_lbw'
                );
            }
            if (doc.birth_weight === 'Yellow' || doc.birth_weight === 'Red') {
                msg = msg_lbw;
            }
            if (doc.outcome_mother === 'Deceased') {
                msg += " Please submit the Start/Stop Notifications form.";
                msg = msg.replace('mother and baby', 'baby');
                // clear all other reminders
                utils.clearScheduledMessages(
                    registration, 'counseling_reminder_lbw', 'counseling_reminder'
                );
            }
            if (!doc.outcome_mother && !doc.outcome_child && !doc.birth_weight)
                msg += " Please complete necessary protocol.";

            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n(msg, {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });

            self.db.saveDoc(registration, function(err) {
                callback(err, true);
            });
        });
    }
};
