var _ = require('underscore'),
    utils = require('../lib/utils');

module.exports = {
    onMatch: function(change, callback) {
        var doc = change.doc,
            clinicName,
            clinicPhone;

        clinicName = utils.getClinicName(doc);
        clinicPhone = utils.getClinicPhone(doc);

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var highRisk,
                parentPhone;

            if (err) {
                callback(err);
            } else if (registration) {
                parentPhone = utils.getParentPhone(registration);
                highRisk = _.first(registration.danger_signs) != null;

                if (highRisk) {
                    utils.addMessage(doc, clinicPhone, i18n("Thank you {{clinic_name}}. This pregnancy is high-risk. Call nearest health worker or SBA.", {
                        clinic_name: clinicName
                    }));
                    utils.addMessage(doc, parentPhone, i18n("{{clinic_name}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk.", {
                        clinic_name: clinicName,
                        patient_name: registration.patient_name
                    }));
                } else {
                    utils.addMessage(doc, clinicPhone, i18n("Thank you {{clinic_name}}. Please submit birth report after baby is delivered.", {
                        clinic_name: clinicName
                    }));
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
