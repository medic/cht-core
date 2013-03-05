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
    clinicContactName,
    registration,
    clinicPhone,
    grandparentPhone,
    new_doc;

//
// if you changes to these strings make sure they are correctly paired with a
// translation in the sentinel-translation config doc
//
var msgs = {
    normal: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded.',
    normal_with_proto: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. Please complete necessary protocol.',
    lbw: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. The Baby is LBW. Please refer the mother and baby to the health post immediately.',
    onot_reminder: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. Please submit the Start/Stop Notifications form.',
    lbw_and_onot: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. The Baby is LBW. Please refer the baby to the health post immediately. Please submit the Start/Stop Notifications form.',
    warning_and_onot: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. If danger sign, please call health worker immediately and fill in the emergency report. Please submit the Start/Stop Notifications form.',
    warning: 'Thank you, {{contact_name}}. Birth outcome report for {{serial_number}} has been recorded. If danger sign, please call health worker immediately and fill in the emergency report.',
    edd_warn: 'Thank you, {{contact_name}}. You just submitted a birth outcome report for {{serial_number}}. Her EDD is >45 days away. A health worker will call you to confrim the validity of the record soon.',
    edd_warn_facility: '{{contact_name}} has submitted a birth outcome report for {{patient_id}}. Her EDD is > 45 days away. Please confirm with {{contact_name}} that the report is valid.',
    dup: 'The birth outcome report you sent appears to be a duplicate. A health facility staff will call you soon to confirm the validity of the forms.',
    not_found: "No patient with id '{{patient_id}}' found."
};

var checkRegistration = function(callback) {
    var msg = msgs.not_found;
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

var checkDups = function(callback) {

    var msg = msgs.dup;

    var onlyValid = function(row) {
        // only valid records count as dups
        if (row.doc.errors.length > 0) return false;
        return true;
    };

    var opts = {
        doc: new_doc,
        patient_id: registration.patient_id,
        filter: onlyValid
    };

    utils.checkDuplicates(opts, function(err) {
        if (err) return callback(msg);
        callback();
    });

};

var checkEDDProximity = function(callback) {

    var doc = new_doc,
        proximity = config.get('ohw_birth_report_within_days');

    // if submitted more than 45 days before EDD include alert
    if (moment(doc.reported_date).add('days', proximity).valueOf()
        < registration.expected_date) {

        utils.addError(doc, {
            message: mustache.to_html('Sent > 45 days from EDD', {
                patient_id: doc.patient_id
            })
        });

        if (grandparentPhone) {
            utils.addMessage(doc, {
                phone: grandparentPhone,
                message: i18n(msgs.edd_warn_facility, {
                    contact_name: clinicContactName,
                    patient_id: registration.patient_id
                })
            });
        }
        return callback(msgs.edd_warn);
    }

    callback();
};

var addResponses = function() {

    var doc = new_doc;

    function finalize(msg) {
        utils.addMessage(doc, {
            phone: clinicPhone,
            message: i18n(msg, {
                contact_name: clinicContactName,
                serial_number: registration.serial_number
            })
        });
    }

    if (doc.outcome_child === 'Alive and Well'
            && doc.outcome_mother === 'Alive and Well'
            && doc.birth_weight === 'Green')
        return finalize(msgs.normal);

    if (doc.outcome_child === 'Alive and Well'
            && doc.outcome_mother === 'Alive and Well'
            && doc.birth_weight !== 'Green')
        return finalize(msgs.lbw);

    if (doc.outcome_child === 'Alive and Well'
            && doc.outcome_mother === 'Deceased'
            && doc.birth_weight === 'Green')
        return finalize(msgs.onot_reminder);

    if (doc.outcome_child === 'Alive and Well'
            && doc.outcome_mother === 'Deceased'
            && doc.birth_weight !== 'Green')
        return finalize(msgs.lbw_and_onot);

    if (doc.outcome_child === 'Alive and Sick'
            && doc.outcome_mother === 'Deceased'
            && doc.birth_weight === 'Green')
        return finalize(msgs.warning_and_onot);

    if (doc.outcome_child === 'Alive and Sick'
            && doc.outcome_mother === 'Deceased'
            && doc.birth_weight !== 'Green')
        return finalize(msgs.lbw_and_onot);

    if (doc.outcome_child !== 'Deceased'
            && doc.birth_weight !== 'Green')
        return finalize(msgs.lbw);

    if (doc.outcome_child === 'Alive and Sick'
            || doc.outcome_mother === 'Alive and Sick')
        return finalize(msgs.warning);

    if (doc.outcome_child === 'Deceased')
        return finalize(msgs.normal);

    if (doc.outcome_mother === 'Deceased')
        return finalize(msgs.onot_reminder);

    finalize(msgs.normal_with_proto);

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
            checkDups,
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
    grandparentPhone= utils.getGrandparentPhone(new_doc);

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
