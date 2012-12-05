var config = require('../config'),
    i18n = require('../i18n'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    db;

module.exports = {
    form: 'OANC',
    requiredFields: 'related_entities.clinic',
    onMatch: function(change, callback) {
        var clinicName,
            clinicPhone,
            doc = change.doc;

        db = db || require('../db');

        clinicPhone = utils.getClinicPhone(doc);
        clinicName = utils.getClinicName(doc);
        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var changed,
                horizon;

            if (err) {
                callback(err);
            } else if (registration) {
                utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. ANC counseling visit for {{patient_name}} has been recorded.", {
                    clinic_name: clinicName,
                    patient_name: patientName
                }));
                horizon = moment(date.getDate()).add('days', config.get('ohw_obsolete_anc_reminders_days'));
                changed = utils.obsoleteScheduledMessages(registration, 'anc_visit', horizon.valueOf());
                if (changed) {
                    db.saveDoc(registration, function(err) {
                        callback(err, true);
                    });
                } else {
                    callback(null, true);
                }
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
