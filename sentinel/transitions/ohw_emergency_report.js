var _ = require('underscore'),
    i18n = require('../i18n'),
    utils = require('../lib/utils');

var handleOnMatch = function(change, callback) {
    var doc = change.doc,
        clinicContactName,
        clinicPhone,
        parentPhone = utils.getParentPhone(doc),
        msg,
        msg2;

    clinicPhone = utils.getClinicPhone(doc);
    clinicContactName = utils.getClinicContactName(doc);

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

        if (doc.anc_labor_pnc !== 'In labor' && doc.labor_danger === 'No') {
            //todo/update messaging
            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n("Thank you, {{contact_name}}. No danger sign for {{serial_number}} has been recorded.", {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });
            return callback(null, true);
        }

        if (doc.anc_labor_pnc !== 'In labor') {
            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n("Thank you, {{contact_name}}. Danger sign for {{serial_number}} has been recorded.", {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });
            if (doc.advice_received === 'No') {
                utils.addMessage(doc, {
                    phone: parentPhone || '',
                    message: i18n(
                        "{{contact_name}} has reported a danger sign for {{patient_id}}. Please follow up with her and provide necessary assistance immediately.", {
                        contact_name: clinicContactName,
                        patient_id: doc.patient_id
                    })
                });
            }
        }

        if (doc.anc_labor_pnc === 'In labor') {
            msg = "Thank you {{contact_name}}. Labor report for" +
                " {{serial_number}} has been recorded. Please submit the" +
                " birth outcome report after delivery.";

            msg2 = "{{contact_name}} has reported a labor. Please follow up" +
                " with her and provide necessary assistance immediately.";

            if (doc.labor_danger === 'Yes') {
                msg = "Thank you {{contact_name}}. Labor report and danger sign" +
                    " for {{serial_number}} has been recorded. Please submit the" +
                    " birth outcome report after delivery.";
                msg2 = "{{contact_name}} has reported a danger sign during labor." +
                    " Please follow up with her and provide necessary" +
                    " assistance immediately.";
            }

            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n(msg, {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });

            if (doc.advice_received === 'No') {
                utils.addMessage(doc, {
                    phone: parentPhone || '',
                    message: i18n(msg2, {contact_name: clinicContactName})
                });
            }

        }

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

        callback(null, true);

    });
};

module.exports = {
    db: require('../db'),
    onMatch: handleOnMatch
};
