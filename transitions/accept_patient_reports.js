var _ = require('underscore'),
    async = require('async'),
    configLib = require('../config'),
    messages = require('../lib/messages'),
    moment = require('moment'),
    validation = require('../lib/validation'),
    utils = require('../lib/utils'),
    transitionUtils = require('./utils'),
    date = require('../date'),
    NAME = 'accept_patient_reports';

const _hasConfig = (doc) => {
    return Boolean(getConfig(doc.form));
};

// find the messages to clear
const findToClear = (registration, reported_date, config) => {
    const reportedDateMoment = moment(reported_date);
    const taskTypes = config.silence_type.split(',').map(type => type.trim());
    let silence_until,
        firstClearedInGroup;

    if (config.silence_for) {
        silence_until = reportedDateMoment.clone();
        silence_until.add(date.getDuration(config.silence_for));
    }

    return utils.getScheduledTasksByType(registration, taskTypes)
        .filter(msgTask => {
            const due = moment(msgTask.due);

            // If we have a silence_until value, and at least one msg of the group falls within
            // the silence window, then clear the entire group. But not subsequent groups.
            if (silence_until) {
                if (!firstClearedInGroup) {
                    // capture first match for group matching
                    const isInWindowAndScheduled = (
                        due >= reportedDateMoment &&
                        due <= silence_until &&
                        msgTask.state === 'scheduled'
                    );
                    if (isInWindowAndScheduled) {
                        firstClearedInGroup = msgTask;
                        return true; // clear!
                    }
                }
                // clear the rest of the group, whether in or out of window.
                return (firstClearedInGroup && firstClearedInGroup.group === msgTask.group);
            } else {
                // If no silence_until value, clear all messages in the future.
                return (
                    due >= reportedDateMoment &&
                    msgTask.state === 'scheduled'
                );
            }
        });
};

const getConfig = function(form) {
    const fullConfig = configLib.get('patient_reports') || [];
    return _.findWhere(fullConfig, { form: form });
};

const _silenceReminders = (audit, registration, reported_date, config, callback) => {
    // filter scheduled message by group
    var toClear = findToClear(registration, reported_date, config);
    if (!toClear.length) {
        return callback();
    }
    toClear.forEach(function(task) {
        if (task.state === 'scheduled') {
            utils.setTaskState(task, 'cleared');
        }
    });
    audit.saveDoc(registration, callback);
};

const silenceRegistrations = (
            audit,
            config,
            doc,
            registrations,
            callback) => {
    if (!config.silence_type) {
        return callback(null, true);
    }
    async.forEach(
        registrations,
        function(registration, callback) {
            if (doc._id === registration.id) {
                // don't silence the registration you're processing
                return callback();
            }
            module.exports._silenceReminders(
                audit, registration, doc.reported_date, config, callback);
        },
        function(err) {
            callback(err, true);
        }
    );
};

const validate = (config, doc, callback) => {
    var validations = config.validations && config.validations.list;
    return validation.validate(doc, validations, callback);
};

const addErrorsToDoc = (errors, doc, config) => {
    messages.addErrors(doc, errors);
    if (config.validations.join_responses) {
        var msgs = [];
        errors.forEach(err => {
            if (err.message) {
                msgs.push(err.message);
            } else if (err) {
                msgs.push(err);
            }
        });
        messages.addReply(doc, msgs.join('  '));
    } else {
        messages.addReply(doc, errors[0].message || errors[0]);
    }
};

const addMessagesToDoc = (doc, config, registrations, patientContact) => {
    const locale = utils.getLocale(doc);
    config.messages.forEach(msg => {
        if (msg.event_type === 'report_accepted') {
            messages.addMessage({
                doc: doc,
                message: messages.getMessage(msg, locale),
                phone: messages.getRecipientPhone(doc, msg.recipient),
                patient: patientContact,
                registrations: registrations
            });
        }
    });
};

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc &&
            doc.type === 'data_record' &&
            doc.form &&
            doc.reported_date &&
            !transitionUtils.hasRun(doc, NAME) &&
            _hasConfig(doc) &&
            utils.getClinicPhone(doc)
        );
    },
    _silenceReminders: _silenceReminders,
    // also used by registrations transition.
    handleReport: function(
            db,
            audit,
            doc,
            patientContact,
            config,
            callback) {
        utils.getRegistrations({
            db: db,
            id: doc.fields && doc.fields.patient_id
        },
        function(err, registrationRows) {
            if (err) {
                return callback(err);
            }
            const registrations = registrationRows.map(row => row.doc);

            if (patientContact) {
                addMessagesToDoc(doc, config, registrations, patientContact);
            }

            if (registrations && registrations.length) {
                return silenceRegistrations(
                    audit,
                    config,
                    doc,
                    registrations,
                    callback);
            }

            return callback(null, true);
        });
    },
    onMatch: function(change, _db, _audit, callback) {
        const doc = change.doc;

        const config = getConfig(doc.form);

        if (!config) {
            return callback();
        }

        validate(config, doc, function(errors) {
            if (errors && errors.length > 0) {
                addErrorsToDoc(errors, doc, config);
                return callback(null, true);
            }

            utils.getPatientContact(_db, doc.fields.patient_id, function(err, patientContact) {
                if (err) {
                    return callback(err);
                }
                if (!patientContact) {
                    transitionUtils.addRegistrationNotFoundError(doc, config);
                    return callback(null, true);
                }
                module.exports.handleReport(
                    _db,
                    _audit,
                    doc,
                    patientContact,
                    config,
                    callback);
            });
        });
    }
};
