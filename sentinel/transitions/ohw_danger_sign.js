var _ = require('underscore'),
    i18n = require('../i18n'),
    utils = require('../lib/utils');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            clinicName,
            clinicPhone,
            parentPhone = utils.getParentPhone(doc);

        clinicPhone = utils.getClinicPhone(doc);
        clinicName = utils.getClinicName(doc);

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            if (err) {
                callback(err);
            } else if (registration) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}.", {
                        danger_sign: doc.danger_sign,
                        patient_name: doc.patient_name
                    })
                });

                registration.danger_signs = _.uniq(_.union(registration.danger_signs || [], [doc.danger_sign]));

                utils.updateScheduledMessage(registration, {
                    message: i18n("Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk.", {
                        clinic_name: clinicName,
                        patient_name: registration.patient_name
                    }),
                    type: 'upcoming_delivery'
                });
                if (parentPhone) {
                    utils.addMessage(doc, {
                        phone: parentPhone,
                        message: i18n("{{clinic_name}} has reported danger sign {{danger_sign}} is present " +
                                      "in {{patient_name}}. Please follow up.", {
                            clinic_name: clinicName,
                            danger_sign: doc.danger_sign,
                            patient_name: registration.patient_name
                        })
                    });
                }
                module.exports.db.saveDoc(registration, function(err) {
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
    }
};
