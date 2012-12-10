var _ = require('underscore'),
    utils = require('../lib/utils'),
    i18n = require('../i18n');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var clinicName,
            clinicPhone,
            doc = change.doc,
            self = module.exports;

        clinicPhone = utils.getClinicPhone(doc);
        clinicName = utils.getClinicName(doc);
        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var previousWeight;

            if (err) {
                callback(err);
            } else {
                if (registration) {
                    previousWeight = registration.childWeight || registration.child_birth_weight;
                    if (previousWeight === 'Normal' && doc.child_weight !== 'Normal') {
                        utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. This child is low birth weight. " +
                           "provide extra thermal protection for baby, feed the baby every two hours, visit the family " +
                           "every day to check the baby for the first week, watch for signs of breathing difficulty. " +
                           "Refer danger signs immediately to health facility.", {
                                clinic_name: clinicName
                        }));
                    } else {
                        utils.addMessage(doc, clinicPhone, i18n("Thank you, {{clinic_name}}. PNC counseling visit has been recorded for {{patient_name}}.", {
                            clinic_name: clinicName,
                            patient_name: doc.patient_name
                        }));
                    }
                    registration.child_weight = doc.child_weight;
                    self.db.saveDoc(registration, function(err) {
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
            }
        });
    }
};
