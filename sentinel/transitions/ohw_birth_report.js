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
                parentPhone;

            if (err) {
                callback(err);
            } else if (registration) {
                parentPhone = utils.getParentPhone(registration);

                _.extend(registration, {
                    child_outcome: doc.outcome_child,
                    child_birth_weight: doc.birth_weight,
                    child_birth_date: reportedDate.subtract('days', doc.days_since_delivery).valueOf()
                });
                utils.clearScheduledMessages(registration, 'anc_visit', 'miso_reminder', 'upcoming_delivery', 'pnc_visit', 'outcome_request');

                if (registration.child_birth_weight === 'Green') {
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n("Thank you, {{clinicName}}. Birth report has been recorded.", {
                            clinicName: clinicName
                        })
                    });
                    self.scheduleReminders(registration, clinicName, clinicPhone, config.get('ohw_pnc_schedule_days'));
                } else {
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n("Thank you, {{clinicName}}. This child is low birth weight. " +
                                      "Provide extra thermal protection for baby, feed the baby every two hours, " +
                                      "visit the family every day to check the baby for the first week, watch for " +
                                      "signs of breathing difficulty. Refer danger signs immediately to health facility.", {
                            clinicName: clinicName
                        })
                    });
                    self.scheduleReminders(registration, clinicName, clinicPhone, config.get('ohw_low_weight_pnc_schedule_days'));
                }
                self.db.saveDoc(registration, function(err) {
                    callback(err, true);
                });
            } else if (clinicPhone) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("No patient with id '{{patient_id}}' found.", {
                        patient_id: doc.patient_id
                    })
                });
                callback(null, true);
            } else {
                callback(null, false);
            }
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
