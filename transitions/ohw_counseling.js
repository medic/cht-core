var async = require('async'),
    i18n = require('../i18n'),
    utils = require('../lib/utils'),
    template = require('../lib/template');

var clinicContactName,
    registration,
    clinicPhone,
    new_doc;

var checkRegistration = function(callback) {
    var msg = 'No patient with id \'{{patient_id}}\' found.';
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

var checkDups = function(callback) {

    var msg = 'The ANC report you sent appears to be a duplicate. A health' +
        ' facility staff will call you soon to confirm the validity of the' +
        ' forms.';

    if (new_doc.anc_pnc === 'PNC') {
        msg = msg.replace(/ANC/g, 'PNC');
    }

    var dups = function(row) {
        var keys = [
           'anc_pnc',
           'deworming_tablet',
           'iron_tablet',
           'tetanus_toxoid',
           'misoprostol_counseling',
           'misoprostol_given',
           'days_since_birth',
           'vitamins',
           'weight'
        ];
        for (var i in keys) {
            if (keys.hasOwnProperty(i)) {
                var k = keys[i];
                if (row.doc[k] !== new_doc[k]) {
                    return false;
                }
            }
        }
        return true;
    };
    var opts = {
        doc: new_doc,
        patient_id: registration.patient_id,
        time_key: 'days',
        time_val: 4,
        filter: dups
    };
    utils.checkOHWDuplicates(opts, function(err) {
        if (err) {
            return callback(msg);
        }
        return callback();
    });
};

var validate = function(callback) {

    var doc = new_doc,
        validations = [checkRegistration, checkDups];

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

var handleMatch = function(change, db, audit, callback) {

    new_doc = change.doc;
    clinicPhone = utils.getClinicPhone(change.doc);
    clinicContactName = utils.getClinicContactName(change.doc);

    validate(function(err) {
        if (err) { // validation failed, finalize transition
            return callback(null, true);
        } else if (new_doc.anc_pnc === 'ANC') {
            processANC();
        } else if (new_doc.anc_pnc === 'PNC') {
            processPNC();
        } else {
            processOther();
        }

        // save registration/schedule doc changes and finalize transition
        audit.saveDoc(registration, function(err) {
            return callback(err, true);
        });
    });
};

var processANC = function() {
    var msg = 'Thank you, {{contact_name}}. ANC Visit for {{serial_number}}' +
        ' has been recorded.';
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

    var msg = 'Thank you, {{contact_name}}! PNC Visit has been' +
        ' recorded for {{serial_number}}.';

    if (new_doc.weight === 'Yellow' || new_doc.weight === 'Red') {
        msg = 'Thank you, {{contact_name}}! PNC Visit has been' +
            ' recorded for {{serial_number}}. The baby is of low' +
            ' birth weight. Please refer to health facility immediately.';
    }

    utils.obsoleteScheduledMessages(
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

var processOther = function() {

    var msg = 'Thank you, {{contact_name}}. Counseling visit for' +
        ' {{serial_number}} has been recorded. Please complete necessary' +
        ' protocol.';

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
