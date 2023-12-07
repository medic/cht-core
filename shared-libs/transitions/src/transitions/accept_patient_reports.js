const _ = require('lodash');
const config = require('../config');
const messages = require('../lib/messages');
const moment = require('moment');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const date = require('../date');
const db = require('../db');
const NAME = 'accept_patient_reports';

const _hasConfig = doc => {
  return Boolean(getConfig(doc.form));
};

// This is more complicated than it needs to be because JS / _ always use ===
// for equality, complicating the use of unique tuples (i.e. [1,2] !== [1,2])
const hasGroupAndType = (groupTypeColl, [group, type]) => groupTypeColl.find(([g, t]) => g === group && t === type);

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
  // See:https://docs.communityhealthtoolkit.org/apps/guides/messaging/sms-states/
  // Both scheduled and pending have not yet been either seen by a gateway or
  // delivered, so they are both clearable.
  // Also clear `muted` schedules, as they could be `unmuted` later
  const statesToClear = ['pending', 'scheduled', 'muted'];

  const reportedDateMoment = moment(reported_date);
  const taskTypes = config.silence_type.split(',').map(type => type.trim());

  const tasksUnderReview = getScheduledTasksByType(registration, taskTypes);

  if (!config.silence_for) {
    // No range, all clearable tasks should be cleared
    return tasksUnderReview.filter(task => statesToClear.includes(task.state));
  }
  // Clear all tasks that are members of a group that "exists" before the
  // silenceUntil date. e.g., they have at least one task in their group
  // whose due date is before silenceUntil.
  const silenceUntil = reportedDateMoment.clone();
  silenceUntil.add(date.getDuration(config.silence_for));

  const allTasksBeforeSilenceUntil = tasksUnderReview.filter(task => moment(task.due) <= silenceUntil);
  const groupTypeCombosToClear = uniqueGroupTypeCombos(allTasksBeforeSilenceUntil);

  return tasksUnderReview.filter(({ group, type, state }) => {
    // only clear tasks that are in a clearable state!
    return hasGroupAndType(groupTypeCombosToClear, [group, type]) && statesToClear.includes(state);
  });
};

const getConfig = function(form) {
  const fullConfig = config.get('patient_reports') || [];
  return _.find(fullConfig, { form: form });
};

const _silenceReminders = (registration, report, config) => {
  const toClear = module.exports._findToClear(
    registration,
    report.reported_date,
    config
  );
  if (!toClear.length) {
    return Promise.resolve();
  }

  toClear.forEach(task => {
    utils.setTaskState(task, 'cleared');
    task.cleared_by = report._id;
  });

  return db.medic.post(registration).then(response => {
    registration._rev = response.rev;
  });
};

const addRegistrationToDoc = (doc, registrations) => {
  if (registrations.length) {
    const latest = _.maxBy(registrations, registration => moment(registration.reported_date));
    doc.registration_id = latest._id;
  }
};

// This function implements the logic documented in
// https://github.com/medic/medic/issues/4694#issuecomment-459460521
const findValidRegistration = (doc, config, registrations) => {
  const visitReportedDate = moment(doc.reported_date);

  const silenceFor = date.getDuration(config.silence_for);

  for (let i = 0; i < registrations.length; i++) {
    const registration = registrations[i];
    if (registration.scheduled_tasks && registration.scheduled_tasks.length) {
      const scheduledTasks = _.sortBy(registration.scheduled_tasks, 'due');
      // if the visit was reported prior to the the most recent scheduled task
      // we move to the next registration because the visit does not get
      // associated to anything: no reminder messages have been sent yet OR
      // visit is not responding to a reminder (in this case, existing functionality
      // will set the cleared_by)
      if (visitReportedDate < moment(scheduledTasks[0].due)) {
        continue;
      }
      // Then we start with the oldest task (based on due date) and loop through
      // the scheduled tasks
      for (let j = scheduledTasks.length - 1; j >= 0; j--) {
        const task = scheduledTasks[j];
        const prevTask = scheduledTasks[j - 1]; // will be undefined when j === 0

        const silenceStart = moment(task.due);
        silenceStart.subtract(silenceFor);
        // If the visit falls within the silence_for range of a reminder that
        // has been cleared, we move to the next registration because we assume
        // that this visit is not responding to the reminder. This happens only when
        // we are transitioning from one group to another one. Note that existing
        // functionality will set the cleared_by on the reminders of the task group
        if (silenceStart < visitReportedDate &&
            task.state === 'cleared' &&
            prevTask &&
            prevTask.group !== task.group) {
          break;
        }

        // We loop through until we find a task that has been "delivered" or "sent" and
        // that is older than the visit reported date
        if (moment(task.due) < visitReportedDate &&
              ['delivered', 'sent'].includes(task.state)) {
          if (!task.responded_to_by) {
            task.responded_to_by = [];
          }
          task.responded_to_by.push(doc._id);

          return registration;
        }
      }
    }
  }

  return false;
};

const addReportUUIDToRegistration = (doc, config, registrations) => {
  const validRegistration = registrations.length && findValidRegistration(doc, config, registrations);
  if (validRegistration) {
    return db.medic.put(validRegistration);
  }
  return Promise.resolve();
};

const silenceRegistrations = (config, doc, registrations) => {
  if (!config.silence_type) {
    return Promise.resolve();
  }
  let promiseChain = Promise.resolve();
  registrations.forEach(registration => {
    if (doc._id !== registration._id) {
      // don't silence the registration you're processing
      promiseChain = promiseChain.then(() => module.exports._silenceReminders(registration, doc, config));
    }
  });

  return promiseChain;
};

// NB: this is very similar to a function in the registration transition, except
//     they also allow for an empty event_type
const messageRelevant = (msg, doc) => {
  if (msg.event_type === 'report_accepted') {
    const expr = msg.bool_expr;
    if (utils.isNonEmptyString(expr)) {
      return utils.evalExpression(expr, { doc: doc });
    }
    return true;
  }
};

const addMessagesToDoc = (doc, config, registrations, placeRegistrations) => {
  config.messages.forEach(msg => {
    if (messageRelevant(msg, doc)) {
      messages.addMessage(doc, msg, msg.recipient, {
        patient: doc.patient,
        registrations: registrations,
        place: doc.place,
        placeRegistrations,
      });
    }
  });
};

const getRegistrations = (contact) => {
  if (!contact) {
    return [];
  }
  const subjectIds = utils.getSubjectIds(contact);
  if (subjectIds && subjectIds.length) {
    return utils.getReportsBySubject({ ids: subjectIds, registrations: true });
  }

  return [];
};

const handleReport = (doc, config) => {
  return Promise
    .all([
      getRegistrations(doc.patient),
      getRegistrations(doc.place),
    ])
    .then(([patientRegistrations, placeRegistrations]) => {
      const allRegistrations = [...patientRegistrations, ...placeRegistrations];

      addMessagesToDoc(doc, config, patientRegistrations, placeRegistrations);
      addRegistrationToDoc(doc, allRegistrations);

      return module.exports
        .silenceRegistrations(config, doc, allRegistrations)
        .then(() => addReportUUIDToRegistration(doc, config, allRegistrations));
    });
};

module.exports = {
  name: NAME,
  filter: function({ doc, info }) {
    return Boolean(
      doc &&
      doc.type === 'data_record' &&
      doc.form &&
      doc.reported_date &&
      !transitionUtils.hasRun(info, NAME) &&
      _hasConfig(doc) &&
      utils.isValidSubmission(doc) // requires either an xform, a public sms form or a known submitter
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

    return transitionUtils
      .validate(config, doc)
      .then(errors => {
        if (errors && errors.length > 0) {
          messages.addErrors(config, doc, errors, { patient: doc.patient });
          return true;
        }

        if (!doc.patient && !doc.place) {
          transitionUtils.addRegistrationNotFoundError(doc, config);
          return true;
        }

        return handleReport(doc, config).then(() => true);
      });
  },
  _silenceReminders: _silenceReminders,
  _findToClear: findToClear,
  _handleReport: handleReport,
  _addMessageToDoc: addMessagesToDoc,
};
