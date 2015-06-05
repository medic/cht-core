var async = require('async'),
    template = require('../lib/template'),
    utils = require('../lib/utils'),
    i18n = require('../i18n'),
    clinicContactName,
    registration,
    clinicPhone,
    new_doc;

var addResponses = function() {

    var doc = new_doc,
        mute = !/^On$/i.test(String(doc.notifications));

    var msg = 'Thank you, {{contact_name}}. Record for {{serial_number}}' +
        ' has been deactivated per your report. No further notifications' +
        ' regarding this patient will be sent.';

    if (!mute) {
        msg = 'Thank you, {{contact_name}}. Record for {{serial_number}}' +
            ' has been reactivated. Notifications regarding this' +
            ' patient will resume.';
    }

    utils.addMessage(doc, {
        phone: clinicPhone,
        message: i18n(msg, {
            serial_number: registration.serial_number,
            contact_name: clinicContactName
        })
    });
};

var updateSchedule = function() {
    var doc = new_doc,
        mute = !/^On$/i.test(String(doc.notifications));

    if (mute) {
        utils.muteScheduledMessages(registration);
        utils.addError(doc, {
            message: template.render('Need to confirm deactivation.', {
                patient_id: doc.patient_id
            })
        });
    } else {
        utils.unmuteScheduledMessages(registration);
    }
};


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

var validate = function(callback) {

    var doc = new_doc,
        validations = [checkRegistration];

    async.series(validations, function(err) {
        if (!err) {
            return callback();
        }
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(err, {
                patient_id: doc.patient_id
            })
        });
        return callback(err);
    });

};

var handleMatch = function(change, db, audit, callback) {
    new_doc = change.doc;
    clinicPhone = utils.getClinicPhone(new_doc);
    clinicContactName = utils.getClinicContactName(new_doc);

    validate(function(err) {
        // validation failed, finalize transition
        if (err) {
            return callback(null, true);
        }
        addResponses();
        updateSchedule();
        audit.saveDoc(registration, function(err) {
             callback(err, true);
        });
    });
};

module.exports = {
    onMatch: handleMatch
};
