var _ = require('underscore'),
    i18n = require('../i18n'),
    mustache = require('mustache'),
    utils = require('../lib/utils'),
    parentPhone,
    clinicPhone,
    registration;


var addAdvice = function(doc) {
    if (!registration) return;
    if (doc.anc_labor_pnc !== 'In labor') return;
    var msg = "{{contact_name}} has reported a labor. Please follow up"
        + " with her and provide necessary assistance immediately.";
    if (doc.labor_danger === 'Yes') {
        msg = "{{contact_name}} has reported a danger sign during labor." +
            " Please follow up with her and provide necessary" +
            " assistance immediately.";
    }
    if (doc.advice_received === 'No') {
        utils.addMessage(doc, {
            phone: parentPhone || '',
            message: i18n(msg2, {contact_name: clinicContactName})
        });
    }
};

var addResponse = function(doc) {
    if (!registration) return;
    if (doc.anc_labor_pnc === 'In labor') {
        msg = "Thank you {{contact_name}}. Labor report for" +
            " {{serial_number}} has been recorded. Please submit the" +
            " birth outcome report after delivery.";

        if (doc.labor_danger === 'Yes') {
            msg = "Thank you {{contact_name}}. Labor report and danger sign" +
                " for {{serial_number}} has been recorded. Please submit the" +
                " birth outcome report after delivery.";
        }

        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(msg, {
                contact_name: clinicContactName,
                serial_number: registration.serial_number
            })
        });
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
};

var validate = function(doc, callback) {
    utils.getOHWRegistration(doc.patient_id, function(err, data) {

        if (err) return callback(err);

        registration = data;

        var msg = "No patient with id '{{patient_id}}' found.";

        if (!registration) {
            if (clinicPhone) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n(msg, { patient_id: doc.patient_id })
                });
            }
            utils.addError(doc, {
                message: mustache.to_html(msg, { patient_id: doc.patient_id })
            });
            return callback(msg);
        }

        var opts = {
            doc:doc, time_key:'hours', time_val:24, patient_id: registration.patient_id
        };
        utils.handleDuplicates(opts, function(err) {
            if (err) return callback(err);
            return callback();
        });
    });
};

var handleOnMatch = function(change, callback) {
    var doc = change.doc,
        msg,
        msg2;

    parentPhone = utils.getParentPhone(doc);
    clinicPhone = utils.getClinicPhone(doc);
    clinicContactName = utils.getClinicContactName(doc);

    validate(doc, function(err) {
        // validation failed, finalize transition
        if (err) return callback(null, true);
        if (doc.anc_labor_pnc !== 'In labor' && doc.labor_danger === 'No') {
            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n("Thank you, {{contact_name}}. No danger sign for {{serial_number}} has been recorded.", {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });
            return callback(null, true);
        }
        addResponse(doc);
        addAdvice(doc);
        callback(null, true);
    });
};

module.exports = {
    db: require('../db'),
    onMatch: handleOnMatch
};
