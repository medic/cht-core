var _ = require('underscore'),
    moment = require('moment'),
    date = require('../date'),
    config = require('../config'),
    ids = require('../lib/ids'),
    utils = require('../lib/utils'),
    i18n = require('../i18n');

module.exports = {
    onMatch: function(change, callback) {
        var doc = change.doc,
            self = module.exports;

        self.setId(doc, function() {
            var expected,
                lmp,
                weeks = Number(doc.last_menstrual_period);

            if (_.isNumber(weeks)) {
                lmp = moment(date.getDate()).startOf('day').startOf('week').subtract('weeks', weeks);
                expected = lmp.clone().add('weeks', 40);
                _.extend(doc, {
                    lmp_date: lmp.valueOf(),
                    expected_date: expected.valueOf()
                });
                self.scheduleReminders(doc, lmp, expected);
                self.addAcknowledgement(doc);
                callback(null, true);
            } else {
                callback(null, false);
            }
        });

    },
    setId: function(doc, callback) {
        var id = ids.generate(doc.serial_number),
            self = module.exports;

        utils.getOHWRegistration(id, function(err, found) {
            if (err) {
                callback(err);
            } else if (found) {
                self.setId(doc, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    },
    addAcknowledgement: function(doc) {
        var duration,
            visit = utils.findScheduledMessage(doc, 'anc_visit'),
            clinicName = utils.getClinicName(doc);

        if (visit) {
            duration = moment.duration(visit.due - moment().valueOf());
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n(
                    "Thank you {{clinicName}} for registering {{serial_number}}."
                    + " Patient ID is {{patient_id}}. ANC visit is needed in"
                    + " {{weeks}} weeks.", {
                        clinicName: clinicName,
                        patient_id: doc.patient_id,
                        serial_number: doc.serial_number,
                        weeks: Math.round(duration.asWeeks())
                    }
                )
            });
        } else {
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n("Thank you for registering {{serial_number}}. Patient ID is {{patient_id}}.", {
                    patient_id: doc.patient_id,
                    serial_number: doc.serial_number
                })
            });
        }
    },
    scheduleReminders: function(doc, lmp, expected) {
        var clinicContactName = utils.getClinicContactName(doc),
            now = moment(date.getDate());

        // anc schedule reminders weeks
        _.each(config.get('ohw_anc_reminder_schedule_weeks'), function(offset, i) {
            var due = lmp.clone().add('weeks', offset);
            if (due > now) {
                utils.addScheduledMessage(doc, {
                    due: due.valueOf(),
                    message: i18n('Greetings, {{contact_name}}. {{serial_number}} is due for an ANC visit this week.', {
                        contact_name: clinicContactName,
                        serial_number: doc.serial_number
                    }),
                    number: i + 1,
                    phone: doc.from,
                    type: 'anc_visit'
                });
            }
        });

        // anc schedule reminders days
        // data can be a number or an object like { days: 39, message: 'foo' }
        _.each(config.get('ohw_anc_reminder_schedule_days'), function(data, i) {

            var msg = data.message ||
                'Greetings, {{contact_name}}. {{serial_number}} is due for an ANC visit soon.';
            var due = lmp.clone().add('days', data.days || data);
            if (due > now) {
                utils.addScheduledMessage(doc, {
                    due: due.valueOf(),
                    message: i18n(msg, {
                        contact_name: clinicContactName,
                        serial_number: doc.serial_number,
                        patient_id: doc.patient_id
                    }),
                    number: i + 1,
                    phone: doc.from,
                    type: 'anc_visit'
                });
            }
        });

        // misoprostol reminder
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_miso_reminder_weeks')).valueOf(),
            message: i18n("Greetings, {{contact_name}}. It's now {{serial_number}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!", {
                contact_name: clinicContactName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'miso_reminder'
        });

        // upcoming delivery reminder
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_upcoming_delivery_weeks')).valueOf(),
            message: i18n("Greetings, {{contact_name}}. {{serial_number}} is due to deliver soon.", {
                contact_name: clinicContactName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'upcoming_delivery'
        });

        // outcome request reminder
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_outcome_request_weeks')).valueOf(),
            message: i18n("Greetings, {{contact_name}}. Please submit the birth report for {{serial_number}}.", {
                contact_name: clinicContactName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'outcome_request'
        });

        // counseling reminder
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', 15).valueOf(),
            message: i18n('Greetings, {{contact_name}}. This is a reminder to submit your counseling report for {{serial_number}}.', {
                contact_name: clinicContactName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'counseling_reminder'
        });
    }
};
