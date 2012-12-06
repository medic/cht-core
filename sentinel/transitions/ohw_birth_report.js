var _ = require('underscore'),
    db,
    config = require('../config'),
    date = require('../date'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    onMatch: function(change, callback) {
        var clinicName,
            clinicPhone,
            doc = change.doc,
            reportedDate;

        db = db || require('../db');

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

                if (registration.child_outcome === 'Deceased') {
                    utils.addMessage(doc, clinicPhone, i18n("Thank you for your report."));
                    utils.addMessage(doc, parentPhone, i18n("{{clinic_name}} has reported the child of {{patient_name}} as deceased.", {
                        clinic_name: clinicName,
                        patient_name: doc.patient_name
                    }));
                } else if (registration.child_birth_weight === 'Normal') {
                    utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}.", {
                        clinic_name: clinicName
                    }));
                    self.scheduleReminders(registration, clinicName, clinicPhone, config.get('ohw_pnc_schedule_days'));
                } else {
                    utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility.", {
                        clinic_name: clinicName
                    }));
                    utils.addMessage(doc, clinicPhone, i18n("{{clinic_name}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight.", {
                        clinic_name: clinicName,
                        patient_name: doc.patient_name,
                        birth_weight: registration.child_birth_weight
                    }));
                    self.scheduleReminders(registration, clinicName, clinicPhone, config.get('ohw_low_weight_pnc_schedule_days'));
                }
                db.saveDoc(registration, function(err) {
                    callback(err);
                });
            } else if (clinicPhone) {
                utils.addMessage(doc, clinicPhone, i18n("No patient with id '{{patient_id}}' found.", {
                    patient_id: doc.patient_id
                }));
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
                    message: i18n("Greetings, {{clinic_name}}. {{patient_name}} is due for a PNC visit today.", {
                        clinic_name: clinicName,
                        patient_name: doc.patient_name
                    }),
                    phone: clinicPhone,
                    type: 'pnc_visit'
                });
            }
        });
    }
};

self = module.exports;
