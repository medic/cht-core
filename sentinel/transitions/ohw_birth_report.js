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
        var clinicName,
            clinicPhone,
            doc = change.doc,
            reportedDate,
            self = module.exports;

        clinicPhone = utils.getClinicPhone(doc);
        clinicName = utils.getClinicName(doc);

        if (date.isSynthetic()) {
            reportedDate = moment(date.getDate());
        } else {
            reportedDate = moment(doc.reported_date);
        }
        reportedDate.startOf('day');

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var birthDate,
                parentPhone = utils.getParentPhone(registration),
                msg = "No patient with id '{{patient_id}}' found.",
                conf;

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
                child_outcome: doc.outcome_child,
                child_birth_weight: doc.birth_weight,
                child_birth_date: reportedDate.subtract('days', doc.days_since_delivery).valueOf()
            });

            utils.clearScheduledMessages(
                registration, 'anc_visit', 'miso_reminder', 'upcoming_delivery',
                'pnc_visit', 'outcome_request'
            );

            if (doc.outcome_child === 'Alive and Sick') {
                msg = "Thank you, {{clinicName}}. Birth outcome report for"
                    + " {{serial_number}} has been recorded.";
            } else if (doc.birth_weight === 'Green') {
                msg = "Thank you, {{clinicName}}. Birth outcome report for"
                    + " {{serial_number}} has been recorded.";
                conf = config.get('ohw_pnc_schedule_days');
            } else {
                msg = "Thank you, {{clinicName}}. Birth outcome report"
                    + " for {{serial_number}} has been recorded. The Baby"
                    + " is LBW. Please refer the mother and baby to"
                    + " the health post immediately.";
                conf = config.get('ohw_low_weight_pnc_schedule_days');
            }
            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n(msg, {
                    clinicName: clinicName,
                    serial_number: registration.serial_number
                })
            });
            self.scheduleReminders(
                registration, clinicName, clinicPhone, conf
            );
            self.db.saveDoc(registration, function(err) {
                callback(err, true);
            });
        });
    },
    scheduleReminders: function(doc, clinicName, clinicPhone, days) {
        var now = moment(date.getDate()),
            birth = moment(doc.child_birth_date);

        _.each(days, function(day) {
            var marker = birth.clone().add('days', day);

            if (marker > now) {
                utils.addScheduledMessage(doc, {
                    due: marker.valueOf(),
                    message: i18n("Greetings, {{clinicName}}. {{patient_id}} is due for a PNC visit today.", {
                        clinicName: clinicName,
                        patient_id: doc.patient_id
                    }),
                    phone: clinicPhone,
                    type: 'pnc_visit'
                });
            }
        });
    }
};
