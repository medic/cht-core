var async = require('async'),
    i18n = require('../i18n'),
    utils = require('../lib/utils'),
    template = require('../lib/template'),
    clinicContactName,
    registration,
    clinicPhone,
    healthCenterPhone,
    districtPhone,
    new_doc;

var msgs = {
    danger: 'Thank you, {{contact_name}}. Danger sign for {{serial_number}} has been recorded.',
    no_danger: 'Thank you, {{contact_name}}. No danger sign for {{serial_number}} has been recorded.',
    labor: 'Thank you {{contact_name}}. Labor report for {{serial_number}} has been recorded. Please submit the birth outcome report after delivery.',
    labor_and_danger: 'Thank you {{contact_name}}. Labor report and danger sign for {{serial_number}} has been recorded. Please submit the birth outcome report after delivery.',
    other: 'Thank you, {{contact_name}}. Counseling visit for {{serial_number}} has been recorded. Please complete necessary protocol.',
    not_found: 'No patient with id \'{{patient_id}}\' found.',
    dup_labor: 'The labor report you sent appears to be a duplicate. A health facility staff will call you soon to confirm the validity of the forms.',
    dup_danger: 'The danger sign report you sent appears to be a duplicate. A health facility staff will call you soon to confirm the validity of the forms.',
    alerts: {
        default: '{{contact_name}} has reported a danger sign for {{patient_id}}. Please follow up with her and provide necessary assistance immediately.',
        labor: '{{contact_name}} has reported a labor. Please follow up with her and provide necessary assistance immediately.',
        danger_labor: '{{contact_name}} has reported a danger sign during labor. Please follow up with her and provide necessary assistance immediately.'
    }
};

var addAlerts = function() {
    var doc = new_doc,
        phones = [healthCenterPhone, districtPhone];

    function finalize(msg) {
        phones.forEach(function(phone) {
            if (!phone) {
                return;
            }
            utils.addMessage(doc, {
                phone: phone,
                message: i18n(msg, {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number,
                    patient_id: doc.patient_id
                })
            });
        });
    }

    if ((doc.anc_labor_pnc === 'PNC' || doc.anc_labor_pnc === 'ANC') &&
        doc.labor_danger === 'Yes' &&
        doc.advice_received === 'No') {
            return finalize(msgs.alerts.default);
    }

    if (doc.anc_labor_pnc === 'In labor' &&
        doc.labor_danger === 'No' &&
        doc.advice_received === 'No') {
            return finalize(msgs.alerts.labor);
    }

    if (doc.anc_labor_pnc === 'In labor' &&
        doc.labor_danger === 'Yes' &&
        doc.advice_received === 'No') {
            return finalize(msgs.alerts.danger_labor);
    }

};

var addResponse = function() {
    var doc = new_doc;

    function finalize(msg) {
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(msg, {
                contact_name: clinicContactName,
                serial_number: registration.serial_number,
                patient_id: doc.patient_id
            })
        });
    }

    if ((doc.anc_labor_pnc === 'PNC' || doc.anc_labor_pnc === 'ANC') &&
        doc.labor_danger === 'Yes') {
        return finalize(msgs.danger);
    }

    if ((doc.anc_labor_pnc === 'PNC' || doc.anc_labor_pnc === 'ANC') &&
        doc.labor_danger === 'No') {
        return finalize(msgs.no_danger);
    }

    if (doc.anc_labor_pnc === 'In labor' && doc.labor_danger === 'No') {
        return finalize(msgs.labor);
    }

    if (doc.anc_labor_pnc === 'In labor' && doc.labor_danger === 'Yes') {
        return finalize(msgs.labor_and_danger);
    }

    return finalize(msgs.other);
};

var checkRegistration = function(callback) {
    var msg = msgs.not_found;
    var doc = new_doc;
    utils.getOHWRegistration(doc.patient_id, function(err, data) {
        if (err || !data) {
            utils.addError(doc, {
                message: template.render(msg, {
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
    var opts = {
        doc: new_doc,
        time_key: 'hours',
        time_val: 24,
        patient_id: registration.patient_id
    };
    utils.checkOHWDuplicates(opts, function(err) {
        if (err) {
            return callback(msgs.dup_danger);
        }
        return callback();
    });
};

var checkLaborUnique = function(callback) {
    var opts = {
        doc: new_doc,
        patient_id: registration.patient_id,
        filter: function(row) { return row.doc.anc_labor_pnc === 'In labor'; }
    };
    utils.checkOHWDuplicates(opts, function(err) {
        if (err) {
            return callback(msgs.dup_labor);
        }
        return callback();
    });
};

var validate = function(callback) {

    var doc = new_doc,
        validations;

    if (doc.anc_labor_pnc === 'In labor') {
        validations = [checkRegistration, checkLaborUnique];
    } else {
        validations = [checkRegistration, checkTimePassed];
    }

    async.series(validations, function(err) {
        if (!err) {
            return callback();
        }
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(err, {
                patient_id: doc.patient_id || registration.patient_id
            })
        });
        return callback(err);
    });

};

var handleOnMatch = function(change, db, audit, callback) {

    new_doc = change.doc;
    clinicPhone = utils.getClinicPhone(change.doc);
    healthCenterPhone = utils.getHealthCenterPhone(change.doc);
    districtPhone = utils.getDistrictPhone(change.doc);
    clinicContactName = utils.getClinicContactName(change.doc);

    validate(function(err) {
        // validation failed, finalize transition
        if (err) {
            return callback(null, true);
        }
        addResponse();
        addAlerts();
        callback(null, true);
    });
};

module.exports = {
    onMatch: handleOnMatch
};
