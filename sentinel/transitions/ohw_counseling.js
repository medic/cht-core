var async = require('async'),
    mustache = require('mustache'),
    moment = require('moment'),
    config = require('../config'),
    i18n = require('../i18n'),
    date = require('../date'),
    utils = require('../lib/utils'),
    db = require('../db'),
    clinicContactName,
    registration,
    clinicPhone,
    new_doc;

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

var checkANCTimePassed = function(callback) {

    var msg = "Two or more of the ANC forms you sent are identical. A health"
        + " facility staff will call you soon to confirm the validity of the"
        + " forms.";

    var opts = {
        doc: new_doc,
        time_key: 'days',
        time_val: 4,
        patient_id: registration.patient_id
    };

    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        return callback();
    });

};

var checkDuplicateVals = function(callback) {
    var msg = "Two or more of the ANC forms you sent are identical. A health"
        + " facility staff will call you soon to confirm the validity of the"
        + " forms.";

    if (new_doc.anc_pnc === 'PNC') msg.replace(/ANC/g, 'PNC');

    var dups = function(row) {
        var keys = [
           "anc_pnc",
           "deworming_tablet",
           "iron_tablet",
           "tetanus_toxoid",
           "misoprostol_counseling",
           "misoprostol_given",
           "days_since_birth",
           "vitamins",
           "weight"
       ];
       for (var i in keys) {
           var k = keys[i];
           if (row.doc[k] !== new_doc[k]) return false;
       };
       return true;
    };
    var opts = {
        doc: new_doc,
        patient_id: registration.patient_id,
        time_key: 'days',
        time_val: 4,
        filter: dups
    };
    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        return callback();
    });
};

var validate = function(callback) {

    var doc = new_doc,
        validations = [checkRegistration, checkDuplicateVals];

    //if (doc.anc_pnc === 'ANC')
    //    validations.push(checkANCTimePassed);

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

var handleMatch = function(change, callback) {

    new_doc = change.doc;
    clinicPhone = utils.getClinicPhone(change.doc);
    clinicContactName = utils.getClinicContactName(change.doc);

    validate(function(err) {
        // validation failed, finalize transition
        if (err) return callback(null, true);

        if (new_doc.anc_pnc === 'ANC')
            processANC();
        else if (new_doc.anc_pnc === 'PNC')
            processPNC();

        // save registration/schedule doc changes and finalize transition
        db.saveDoc(registration, function(err) {
            return callback(err, true);
        });
    });
};

var processANC = function() {
    var msg = "Thank you, {{contact_name}}. ANC Visit for {{serial_number}}"
        + " has been recorded.";
    utils.obsoleteScheduledMessages(
        registration, 'anc_visit', new_doc.reported_date
    );
    utils.addMessage(new_doc, {
        phone: clinicPhone,
        message: i18n(msg, {
            contact_name: clinicContactName,
            serial_number: registration.serial_number
        })
    });
};

var processPNC = function() {

    var msg = 'Thank you, {{contact_name}}! PNC Visit has been'
        + ' recorded for {{serial_number}}.';

    if (new_doc.weight === 'Yellow' || new_doc.weight === 'Red') {
        msg = "Thank you, {{contact_name}}! PNC Visit has been"
            + " recorded for {{serial_number}}. The baby is of low"
            + " birth weight. Please refer to health facility"
            + " immediately.";
    }

    var changed = utils.obsoleteScheduledMessages(
        registration, 'counseling_reminder', new_doc.reported_date
    );

    utils.addMessage(new_doc, {
        phone: clinicPhone,
        message: i18n(msg, {
            contact_name: clinicContactName,
            serial_number: registration.serial_number
        })
    });
};

module.exports = {
    onMatch: handleMatch
};
