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

// This is more complicated than it needs to be because JS / _ always use ===
// for equality, complicating the use of unique tuples (i.e. [1,2] !== [1,2])
const hasGroupAndType = (groupTypeColl, [group, type]) =>
    groupTypeColl.find(([g, t]) => g === group && t === type);

// This should just be
//   Object.keys(_.groupBy(tasksToClear, ({group, task}) => [group, task]))
// but JS only supports strings as keys
const uniqueGroupTypeCombos = tasks => {
    const unique = [];
    tasks.forEach(t => {
        if (!hasGroupAndType(unique, [t.group, t.type])) {
            unique.push([t.group, t.type]);
        }
    });
    return unique;
};

/*
 * type is either a string or an array of strings
 */
const getScheduledTasksByType = (registration, type) => {
  const types = typeof type === 'string' ? [type] : type;

  const scheduled_tasks = registration && registration.scheduled_tasks;
  if (!scheduled_tasks || !scheduled_tasks.length) {
    return [];
  }

  return scheduled_tasks.filter(task => types.includes(task.type));
};

// find the messages to clear
const findToClear = (registration, reported_date, config) => {
    // See: https://github.com/medic/medic-docs/blob/master/user/message-states.md#message-states-in-medic-webapp
    // Both scheduled and pending have not yet been either seen by a gateway or
    // delivered, so they are both clearable.
    const typesToClear = ['pending', 'scheduled'];

    const reportedDateMoment = moment(reported_date);
    const taskTypes = config.silence_type.split(',').map(type => type.trim());

    const tasksUnderReview = getScheduledTasksByType(registration, taskTypes);

    if (!config.silence_for) {
        // No range, all clearable tasks should be cleared
        return tasksUnderReview.filter(task => typesToClear.includes(task.state));
    } else {
        // Clear all tasks that are members of a group that "exists" before the
        // silenceUntil date. e.g., they have at least one task in their group
        // whose due date is before silenceUntil.
        const silenceUntil = reportedDateMoment.clone();
        silenceUntil.add(date.getDuration(config.silence_for));

        const allTasksBeforeSilenceUntil = tasksUnderReview.filter(task =>
            moment(task.due) <= silenceUntil);
        const groupTypeCombosToClear = uniqueGroupTypeCombos(allTasksBeforeSilenceUntil);

        return tasksUnderReview.filter(({group, type}) =>
            hasGroupAndType(groupTypeCombosToClear, [group, type]));
    }
};

const getConfig = function(form) {
    const fullConfig = configLib.get('patient_reports') || [];
    return _.findWhere(fullConfig, { form: form });
};

const _silenceReminders = (audit, registration, reported_date, config, callback) => {
    var toClear = module.exports._findToClear(registration, reported_date, config);
    if (!toClear.length) {
        return callback();
    }

    toClear.forEach(task => utils.setTaskState(task, 'cleared'));
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

const addMessagesToDoc = (doc, config, registrations, patientContact) => {
    config.messages.forEach(msg => {
        if (msg.event_type === 'report_accepted') {
            messages.addMessage(doc, msg, msg.recipient, {
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
    _findToClear: findToClear,
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
        function(err, registrations) {
            if (err) {
                return callback(err);
            }

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
                messages.addErrors(config, doc, errors);
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
