var mustache = require('mustache'),
    async = require('async'),
    utils = require('../lib/utils'),
    i18n = require('../i18n'),
    db = require('../db'),
    clinicContactName,
    registration,
    clinicPhone,
    new_doc;

var addResponses = function() {

    var doc = new_doc,
        mute = !/^On$/i.test(String(doc.notifications));

    var msg = "Thank you. All notifications for {{patient_id}} have been"
        + " turned off.";

    if (!mute)
        msg = "Thank you. Notifications for {{patient_id}} have been turned on.";

    utils.addMessage(doc, {
        phone: clinicPhone,
        message: i18n(msg, {patient_id: doc.patient_id})
    });
}

var updateSchedule = function() {

    var doc = new_doc,
        mute = !/^On$/i.test(String(doc.notifications));

    if (mute)
        utils.muteScheduledMessages(registration);
    else
        utils.unmuteScheduledMessages(registration);

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

var validate = function(callback) {

    var doc = new_doc,
        validations = [checkRegistration];

    async.series(validations, function(err) {
        if (!err) return callback();
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(err, {
                patient_id: doc.patient_id
            })
        });
        return callback(err);
    });

};

var handleMatch = function(change, callback) {

    new_doc = change.doc,
    clinicPhone = utils.getClinicPhone(new_doc);
    clinicContactName = utils.getClinicContactName(new_doc);
    parentPhone = utils.getParentPhone(new_doc);

    validate(function(err) {
        // validation failed, finalize transition
        if (err) return callback(null, true);
        addResponses();
        updateSchedule();
        db.saveDoc(registration, function(err) {
             callback(err, true);
        });
    });

};

module.exports = {
    onMatch: handleMatch
};
