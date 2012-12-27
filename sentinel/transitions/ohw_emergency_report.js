var _ = require('underscore'),
    i18n = require('../i18n'),
    utils = require('../lib/utils');

var handleOnMatch = function(change, callback) {
    var doc = change.doc,
        clinicName,
        clinicPhone,
        parentPhone = utils.getParentPhone(doc);

    clinicPhone = utils.getClinicPhone(doc);
    clinicName = utils.getClinicName(doc);

    utils.getOHWRegistration(doc.patient_id, function(err, registration) {

        if (err) {
            return callback(err);
        }

        if (!registration) {
            if (clinicPhone) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("No patient with id '{{patient_id}}' found.", {
                        patient_id: doc.patient_id
                    })
                });
            }
            return callback(null, true);
        }

        if (doc.labor_danger === 'no') {
            //todo/update messaging
            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n("Thank you, {{clinicName}}. No danger sign for {{serial_number}} has been recorded.", {
                    clinicName: clinicName,
                    danger_sign: doc.danger_sign,
                    serial_number: registration.serial_number
                })
            });
            return callback(null, true);
        }

        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n("Thank you, {{clinicName}}. Danger sign for {{serial_number}} has been recorded.", {
                clinicName: clinicName,
                danger_sign: doc.danger_sign,
                serial_number: registration.serial_number
            })
        });

        /* deprecated
         * utils.updateScheduledMessage(registration, {
            message: i18n("Greetings, {{clinicName}}. {{patient_id}} is due to deliver soon. This pregnancy has been flagged as high-risk.", {
                clinicName: clinicName
            }),
            type: 'upcoming_delivery'
        });
        module.exports.db.saveDoc(registration, function(err) {
            callback(err, true);
        });
        */

        if (doc.advice_received === 'no') {
            utils.addMessage(doc, {
                phone: parentPhone || '',
                message: i18n(
                    "{{clinicName}} has reported a danger sign for {{patient_id}}. Please follow up with her and provide necessary assistance immediately.", {
                    clinicName: clinicName,
                    patient_id: doc.patient_id
                })
            });
        }

        callback(null, true);

    });
};

module.exports = {
    db: require('../db'),
    onMatch: handleOnMatch
};
