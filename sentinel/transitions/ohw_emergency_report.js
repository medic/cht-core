var _ = require('underscore'),
    mustache = require('mustache'),
    async = require('async'),
    i18n = require('../i18n'),
    utils = require('../lib/utils'),
    new_doc,
    clinicPhone,
    clinicContactName,
    registration;


var addAlerts = function() {
    var doc = new_doc;

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
            phone: utils.getParentPhone(doc) || '',
            message: i18n(msg2, {contact_name: clinicContactName})
        });
    }
};

var addResponse = function() {
    var doc = new_doc;
    if (doc.anc_labor_pnc !== 'In labor' && doc.labor_danger === 'No') {
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n("Thank you, {{contact_name}}. No danger sign for {{serial_number}} has been recorded.", {
                contact_name: clinicContactName,
                serial_number: registration.serial_number
            })
        });
        return;
    }
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
                phone: utils.getParentPhone(doc) || '',
                message: i18n(
                    "{{contact_name}} has reported a danger sign for {{patient_id}}. Please follow up with her and provide necessary assistance immediately.", {
                    contact_name: clinicContactName,
                    patient_id: doc.patient_id
                })
            });
        }
    }
};

var checkRegistration = function(callback) {
    var msg = "No patient with id '{{patient_id}}' found.";
    var doc = new_doc;
    utils.getOHWRegistration(doc.patient_id, function(err, data) {
        if (err || !data) {
            utils.addError(doc, {
                message: mustache.to_html(msg, {
                    patient_id: doc.patient_id
                })
            });
            return callback(msg);
        }
        registration = data;
        return callback();
    });
};

var checkTimePassed = function(callback) {
    var msg = "Two or more of the danger reports you sent are identical. A"
        + " health facility staff will call you soon to confirm the validity of"
        + " the forms.";
    var opts = {
        doc: new_doc,
        time_key: 'hours',
        time_val: 24,
        patient_id: registration.patient_id
    };
    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        return callback();
    });
};

var checkLaborUnique = function(callback) {
    var msg = "Two or more of the labor reports you sent are identical. A"
        + " health facility staff will call you soon to confirm the validity of"
        + " the forms.";
    var opts = {
        doc: new_doc,
        patient_id: registration.patient_id,
        filter: function(row) { return row.doc.anc_labor_pnc === 'In labor'; }
    };
    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        return callback();
    });
};

var validate = function(callback) {

    var doc = new_doc,
        validations;

    if (doc.anc_labor_pnc === 'In labor')
        validations = [checkRegistration, checkLaborUnique];
    else
        validations = [checkRegistration, checkTimePassed];

    async.series(validations, function(err) {
        if (!err) return callback();
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(err, {
                patient_id: doc.patient_id || registration.patient_id
            })
        });
        return callback(err);
    });

};

var handleOnMatch = function(change, callback) {

    new_doc = change.doc;
    clinicPhone = utils.getClinicPhone(change.doc);
    clinicContactName = utils.getClinicContactName(change.doc);

    validate(function(err) {
        // validation failed, finalize transition
        if (err) return callback(null, true);
        addResponse();
        addAlerts();
        callback(null, true);
    });
};

module.exports = {
    db: require('../db'),
    onMatch: handleOnMatch
};
