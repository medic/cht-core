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
        var visit = utils.findScheduledMessage(doc, 'anc_visit');

        if (visit) {
            var duration = moment.duration(visit.due - moment().valueOf());
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n("Thank you for registering {{serial_number}}. " +
                             "Patient ID is {{patient_id}}. ANC visit {{number}} is in {{weeks}} weeks.", {
                    number: visit.number,
                    patient_id: doc.patient_id,
                    serial_number: doc.serial_number,
                    weeks: Math.round(duration.asWeeks())
                })
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
        var clinicName = utils.getClinicName(doc),
            now = moment(date.getDate());

        _.each(config.get('ohw_anc_reminder_schedule_weeks'), function(offset, i) {
            var due = lmp.clone().add('weeks', offset);
            if (due > now) {
                utils.addScheduledMessage(doc, {
                    due: due.valueOf(),
                    message: i18n('Greetings, {{clinicName}}. {{serial_number}} is due for an ANC visit this week.', {
                        clinicName: clinicName,
                        serial_number: doc.serial_number
                    }),
                    number: i + 1,
                    phone: doc.from,
                    type: 'anc_visit'
                });
            }
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_miso_reminder_weeks')).valueOf(),
            message: i18n("Greetings, {{clinicName}}. It's now {{serial_number}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!", {
                clinicName: clinicName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'miso_reminder'
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_upcoming_delivery_weeks')).valueOf(),
            message: i18n("Greetings, {{clinicName}}. {{serial_number}} is due to deliver soon.", {
                clinicName: clinicName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'upcoming_delivery'
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_miso_reminder_weeks')).valueOf(),
            message: i18n("Greetings, {{clinicName}}. Please submit the birth report for {{serial_number}}.", {
                clinicName: clinicName,
                serial_number: doc.serial_number
            }),
            phone: doc.from,
            type: 'outcome_request'
        });
    }
};
