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
            parentPhone,
            doc = change.doc,
            self = module.exports;

        clinicPhone = utils.getClinicPhone(doc);
        clinicContactName = utils.getClinicContactName(doc);
        parentPhone = utils.getParentPhone(doc);

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {

            var msg = "No patient with id '{{patient_id}}' found.",
                conf = 'ohw_counseling_reminder_days',
                proximity = config.get('ohw_birth_report_within_days');

            if (err)
                return callback(err);

            if (!registration) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n(msg, {patient_id: doc.patient_id})
                });
                utils.addError(doc, {
                    message: i18n(msg, {patient_id: doc.patient_id})
                });
                return callback(null, true);
            }

            // if OBIR is submitted more than 45 days before EDD then ignore
            // and send alert to health facility. it's likely a mistake.
            if (moment(doc.reported_date).add('days', proximity).valueOf()
                < registration.expected_date) {
                var msg1 = '{{contact_name}} has submitted a birth outcome report'
                    + ' for {{patient_id}}. Her EDD is > 45 days away.'
                    + ' Please confirm with {{contact_name}} that the report'
                    + ' is valid.';
                var msg2 = 'Thank you, {{contact_name}}. Birth outcome report'
                    + ' for {{serial_number}} has been recorded. Please'
                    + ' complete necessary protocol.';
                utils.addMessage(doc, {
                    phone: parentPhone,
                    message: i18n(msg1, {
                        contact_name: clinicContactName,
                        patient_id: registration.patient_id
                    })
                });
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n(msg2, {
                        contact_name: clinicContactName,
                        serial_number: registration.serial_number
                    })
                });
                return callback(null, true);
            }

            _.extend(registration, {
                mother_outcome: doc.outcome_mother,
                child_outcome: doc.outcome_child,
                child_birth_weight: doc.birth_weight,
                child_birth_date: moment(doc.reported_date)
                    .startOf('day')
                    .subtract('days', doc.days_since_delivery).valueOf()
            });

            utils.clearScheduledMessages(
                registration, ['anc_visit', 'miso_reminder', 'upcoming_delivery',
                'outcome_request']
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
                conf = 'ohw_counseling_reminder_lbw_days';
            }
            if (doc.outcome_mother === 'Deceased') {
                msg += " Please submit the Start/Stop Notifications form.";
                msg = msg.replace('mother and baby', 'baby');
                conf = null;

                // clear all other reminders
                utils.clearScheduledMessages(
                    registration, ['counseling_reminder_lbw', 'counseling_reminder']
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

            if (conf) {
                self.scheduleReminders(
                    registration, clinicContactName, clinicPhone, conf
                );
            }

            self.db.saveDoc(registration, function(err) {
                 callback(err, true);
             });
         });
    },
    scheduleReminders: function(doc, contactName, clinicPhone, conf) {
        var now = moment(date.getDate()),
            birth = moment(doc.child_birth_date),
            msg = 'Greetings, {{contact_name}}. This is a reminder to'
                + ' submit your counseling report for {{serial_number}}.',
            conf = config.get(conf);

        _.each(conf, function(data, i) {
            if (_.isNumber(data))
                data = {days: data};
            var marker = birth.clone().add('days', data.days);
            if (marker > now) {
                utils.addScheduledMessage(doc, {
                    due: marker.valueOf(),
                    message: i18n(data.message || msg, {
                        contact_name: contactName,
                        patient_id: doc.patient_id,
                        serial_number: doc.serial_number
                    }),
                    phone: clinicPhone,
                    group: data.group,
                    type: 'counseling_reminder'
                });
            }
        });
    }
};
