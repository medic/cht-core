var _ = require('underscore'),
  async = require('async'),
  config = require('../config'),
  messages = require('../lib/messages'),
  moment = require('moment'),
  validation = require('../lib/validation'),
  utils = require('../lib/utils'),
  transitionUtils = require('./utils'),
  date = require('../date'),
  db = require('../db-pouch'),
  dbNano = require('../db-nano'),
  NAME = 'accept_patient_reports';

const _hasConfig = doc => {
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
  // Also clear `muted` schedules, as they could be `unmuted` later
  const typesToClear = ['pending', 'scheduled', 'muted'];

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

    const allTasksBeforeSilenceUntil = tasksUnderReview.filter(
      task => moment(task.due) <= silenceUntil
    );
    const groupTypeCombosToClear = uniqueGroupTypeCombos(
      allTasksBeforeSilenceUntil
    );

    return tasksUnderReview.filter(({ group, type }) =>
      hasGroupAndType(groupTypeCombosToClear, [group, type])
    );
  }
};

const getConfig = function(form) {
  const fullConfig = config.get('patient_reports') || [];
  return _.findWhere(fullConfig, { form: form });
};

const _silenceReminders = (registration, report, config, callback) => {
  var toClear = module.exports._findToClear(
    registration,
    report.reported_date,
    config
  );
  if (!toClear.length) {
    return callback();
  }

  toClear.forEach(task => {
    utils.setTaskState(task, 'cleared');
    task.cleared_by = report._id;
  });
  db.medic.post(registration, callback);
};

const addRegistrationToDoc = (doc, registrations) => {
  if (registrations.length) {
    const latest = _.max(registrations, registration =>
      moment(registration.reported_date)
    );
    doc.registration_id = latest._id;
  }
};

const silenceRegistrations = (config, doc, registrations, callback) => {
  if (!config.silence_type) {
    return callback(null, true);
  }
  async.forEach(
    registrations,
    function(registration, callback) {
      if (doc._id === registration._id) {
        // don't silence the registration you're processing
        return callback();
      }
      module.exports._silenceReminders(registration, doc, config, callback);
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

// NB: this is very similar to a function in the registration transition, except
//     they also allow for an empty event_type
const messageRelevant = (msg, doc) => {
  if (msg.event_type === 'report_accepted') {
    const expr = msg.bool_expr;
    if (utils.isNonEmptyString(expr)) {
      return utils.evalExpression(expr, { doc: doc });
    } else {
      return true;
    }
  }
};

const addMessagesToDoc = (doc, config, registrations) => {
  config.messages.forEach(msg => {
    if (messageRelevant(msg, doc)) {
      messages.addMessage(doc, msg, msg.recipient, {
        patient: doc.patient,
        registrations: registrations,
      });
    }
  });
};

const handleReport = (doc, config, callback) => {
  utils.getRegistrations(
    {
      db: dbNano,
      id: doc.fields.patient_id,
    },
    (err, registrations) => {
      if (err) {
        return callback(err);
      }

      addMessagesToDoc(doc, config, registrations);
      addRegistrationToDoc(doc, registrations);

      module.exports.silenceRegistrations(config, doc, registrations, callback);
    }
  );
};

module.exports = {
  filter: function(doc, info = {}) {
    return Boolean(
      doc &&
        doc.type === 'data_record' &&
        doc.form &&
        doc.reported_date &&
        !transitionUtils.hasRun(info, NAME) &&
        _hasConfig(doc)
    );
  },
  // also used by registrations transition.
  silenceRegistrations: silenceRegistrations,
  onMatch: change => {
    const doc = change.doc;

    const config = getConfig(doc.form);

    if (!config) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      validate(config, doc, function(errors) {
        if (errors && errors.length > 0) {
          messages.addErrors(config, doc, errors, { patient: doc.patient });
          return resolve(true);
        }

        if (!doc.patient) {
          transitionUtils.addRegistrationNotFoundError(doc, config);
          return resolve(true);
        }

        handleReport(doc, config, (err, changed) => {
          if (err) {
            return reject(err);
          }
          return resolve(changed);
        });
      });
    });
  },
  _silenceReminders: _silenceReminders,
  _findToClear: findToClear,
  _handleReport: handleReport,
  _addMessageToDoc: addMessagesToDoc,
};
