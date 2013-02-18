var _ = require('underscore'),
    async = require('async'),
    mustache = require('mustache'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date'),
    i18n = require('../i18n'),
    ids = require('../lib/ids'),
    utils = require('../lib/utils'),
    db = require('../db'),
    clinicPhone,
    clinicContactName,
    parentPhone,
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

var checkDuplicateVals = function(callback) {
    var msg = "Two or more of the birth outcome reports you sent are identical."
        + " A health facility staff will call you soon to confirm the validity"
        + " of the forms."

    var dups = function(row) {
        var keys = [
            "days_since_delivery",
            "birth_site",
            "incentive_received",
            "reporter_present",
            "persons_present",
            "outcome_mother",
            "outcome_child",
            "birth_weight",
            "chlorhexidine_applied",
            "misoprostol_administered"
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
        //time_key: 'days',
        //time_val: 4,
        filter: dups
    };
    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        return callback();
    });
};

var checkEDDProximity = function(callback) {

    var doc = new_doc,
        proximity = config.get('ohw_birth_report_within_days');

    var msg1 = '{{contact_name}} has submitted a birth outcome report'
        + ' for {{patient_id}}. Her EDD is > 45 days away.'
        + ' Please confirm with {{contact_name}} that the report'
        + ' is valid.';

    var msg2 = 'Thank you, {{contact_name}}. Birth outcome report'
        + ' for {{serial_number}} has been recorded. Please'
        + ' complete necessary protocol.';

    var clinicMsg = i18n(msg2, {
        contact_name: clinicContactName,
        serial_number: registration.serial_number
    });

    // If OBIR is submitted more than 45 days before EDD include alert to
    // health facility.
    if (moment(doc.reported_date).add('days', proximity).valueOf()
        < registration.expected_date) {
        utils.addMessage(doc, {
            phone: parentPhone,
            message: i18n(msg1, {
                contact_name: clinicContactName,
                patient_id: registration.patient_id
            })
        });
        return callback(clinicMsg);
    }
    callback();
};

var addResponses = function() {

    var doc = new_doc;

    var msg = "Thank you, {{contact_name}}. Birth outcome report for"
        + " {{serial_number}} has been recorded.";

    var msg_lbw = "Thank you, {{contact_name}}. Birth outcome report"
        + " for {{serial_number}} has been recorded. The Baby"
        + " is LBW. Please refer the mother and baby to"
        + " the health post immediately.";

    var msg_lbw = "Thank you, {{contact_name}}. Birth outcome report"
        + " for {{serial_number}} has been recorded. The Baby is LBW."
        + " Please refer the mother and baby to the health post immediately.";

    var msg_sick_child = "Thank you, {{contact_name}}. Birth outcome report for"
        + " {{serial_number}} has been recorded. If danger sign,"
        + " please call health worker immediately and fill in"
        + " the emergency report.";

    if (doc.outcome_child === 'Alive and Sick') {
        msg = msg_sick_child;
    }

    if (doc.birth_weight !== 'Green')
        msg = msg_lbw;

    if (doc.outcome_mother === 'Deceased') {
        msg += " Please submit the Start/Stop Notifications form.";
        msg = msg.replace('mother and baby', 'baby');
    }

    if (!doc.outcome_mother && !doc.outcome_child && !doc.birth_weight)
        msg += " Please complete necessary protocol.";

    utils.addMessage(doc, {
        phone: clinicPhone,
        message: i18n(msg, {
            contact_name: clinicContactName,
            serial_number: registration.serial_number
        })
    });

};


var updateSchedule = function() {

    var conf = 'ohw_counseling_reminder_days',
        doc = new_doc;

    _.extend(registration, {
        mother_outcome: doc.outcome_mother,
        child_outcome: doc.outcome_child,
        child_birth_weight: doc.birth_weight,
        child_birth_date: moment(doc.reported_date)
            .startOf('day')
            .subtract('days', doc.days_since_delivery).valueOf()
    });

    utils.clearScheduledMessages(
        registration, ['anc_visit', 'miso_reminder', 'upcoming_delivery',
        'outcome_request']
    );

    if (doc.outcome_mother === 'Deceased') {
        // clear all other reminders
        utils.clearScheduledMessages(
            registration, ['counseling_reminder_lbw', 'counseling_reminder']
        );
    } else {
        if (doc.birth_weight === 'Green') {
            utils.clearScheduledMessages(
                registration, 'counseling_reminder_lbw'
            );
        } else {
            conf = 'ohw_counseling_reminder_lbw_days';
        }
        scheduleReminders(conf);
    }
};

var scheduleReminders = function(config_key) {

    var doc = new_doc,
        now = moment(date.getDate()),
        birth = moment(doc.child_birth_date),
        msg = 'Greetings, {{contact_name}}. This is a reminder to'
            + ' submit your counseling report for {{serial_number}}.',
        conf = config.get(config_key);

    _.each(conf, function(data, i) {

        if (_.isNumber(data))
            data = {days: data};

        var marker = birth.clone().add('days', data.days);

        if (marker > now) {
            utils.addScheduledMessage(doc, {
                due: marker.valueOf(),
                message: i18n(data.message || msg, {
                    contact_name: contactName,
                    patient_id: doc.patient_id || registration.patient_id,
                    serial_number: doc.serial_number
                }),
                phone: clinicPhone,
                group: data.group,
                type: 'counseling_reminder'
            });
        }

    });
};

var validate = function(callback) {

    var doc = new_doc,
        validations = [
            checkRegistration,
            checkDuplicateVals,
            checkEDDProximity
        ];

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
