var db,
    utils = require('../lib/utils');

module.exports = {
    form: 'ONOT',
    requiredFields: 'related_entities.clinic patient_id',
    onMatch: function(change, callback) {
        var doc = doc.change,
            clinicPhone = utils.getClinicPhone(doc),
            clinicName = utils.getClinicName(doc);

        db = db || require('../db');

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            if (err) {
                callback(err);
            } else if (registration) {
                if (doc.notifications) {
                    utils.unmuteScheduledMessage(registration);
                    utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. Notifications for {{patient_name}} have been turned on.", {
                        clinic_name: clinicName,
                        patient_name: registration.patient_name
                    }));
                } else {
                    utils.unmuteScheduledMessage(registration);
                    utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. Notifications for {{patient_name}} have been turned off.", {
                        clinic_name: clinicName,
                        patient_name: registration.patient_name
                    }));
                }
                registration.muted = !doc.notifications;

                db.saveDoc(registration, function(err) {
                    callback(err, true);
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
    }
};
