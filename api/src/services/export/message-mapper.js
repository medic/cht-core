const _ = require('underscore'),
      moment = require('moment'),
      db = require('../../db-pouch'),
      config = require('../../config'),
      messageUtils = require('@shared-libs/message-utils'),
      registrationUtils = require('@shared-libs/registration-utils');

const normalizeResponse = doc => {
  return {
    type: 'Automated Reply',
    state: 'sent',
    timestamp: doc.reported_date,
    state_history: [{
      state: 'sent',
      timestamp: doc.reported_date
    }],
    messages: doc.responses
  };
};

const normalizeIncoming = doc => {
  return {
    type: 'Message',
    state: 'received',
    timestamp: doc.reported_date,
    state_history: [{
      state: 'received',
      timestamp: doc.reported_date
    }],
    messages: [{
      sent_by: doc.from,
      message: doc.sms_message.message
    }]
  };
};

const buildHistory = task => {
  const history = {};
  if (task.state_history) {
    task.state_history.forEach(item => {
      history[item.state] = item.timestamp;
    });
  }
  return history;
};

const formatDate = date => {
  if (!date) {
    return '';
  }
  return moment(date).valueOf();
};

const getStateDate = (state, task, history) => {
  let date;
  if (state === 'scheduled' && task.due) {
    date = task.due;
  } else if (history[state]) {
    date = history[state];
  } else if (task.state === state) {
    date = task.timestamp;
  }
  return formatDate(date);
};

/*
  Normalize and combine incoming messages, responses, tasks and
  scheduled_tasks into one array Note, auto responses will likely get
  deprecated soon in favor of sentinel based messages.

  Normalized form:
  {
  type: ['Auto Response', 'Incoming Message', <schedule name>, 'Task Message'],
  state: ['received', 'sent', 'pending', 'muted', 'scheduled', 'cleared'],
  timestamp/due: <date string>,
  messages: [{
      uuid: <uuid>,
      to: <phone>,
      message: <message body>
  }]
  }
*/
const normalizeTasks = doc => {
  let tasks = [];
  if (doc.responses && doc.responses.length > 0) {
    tasks.push(normalizeResponse(doc));
  }
  if (doc.tasks && doc.tasks.length > 0) {
    tasks = tasks.concat(doc.tasks);
  }
  if (doc.scheduled_tasks && doc.scheduled_tasks.length > 0) {
    tasks = tasks.concat(doc.scheduled_tasks);
  }
  if (doc.sms_message && doc.sms_message.message) {
    tasks.push(normalizeIncoming(doc));
  }
  return tasks;
};

const getRecordRegistrations = (registrations, record) => {
  if (!record.patient || !record.patient.patient_id) {
    return [];
  }

  return registrations
    .filter(row => row.key === record.patient.patient_id)
    .map(row => row.doc);
};

module.exports = {
  getDocIds: (options) => {
    return db.medic.query('medic-sms/tasks_messages', options)
      .then(result => result.rows)
      .then(rows => rows.map(row => row.id));
  },
  map: () => {
    return Promise.resolve({
      header: [
        'id',
        'patient_id',
        'reported_date',
        'from',
        'type',
        'state',
        'received',
        'scheduled',
        'pending',
        'sent',
        'cleared',
        'muted',
        'message_id',
        'sent_by',
        'to_phone',
        'content'
      ],
      getRows: record => {
        const tasks = normalizeTasks(record);
        return _.flatten(tasks.map(task => {
          const history = buildHistory(task);

          if (!task.messages) {
            const context = {
              patient: record.patient,
              registrations: record.registrations
            };
            const content = {
              translationKey: task.message_key,
              message: task.message
            };
            task.messages = messageUtils.generate(
              config.get(),
              config.translate,
              record,
              content,
              task.recipient,
              context
            );
          }

          const taskType = (task.translation_key && config.translate(task.translation_key, { group: task.group })) ||
                           task.type ||
                           'Task Message';

          return task.messages.map(message => [
            record._id,
            record.patient_id || (record.patient && record.patient.patient_id),
            formatDate(record.reported_date),
            record.from,
            taskType,
            task.state,
            getStateDate('received', task, history),
            getStateDate('scheduled', task, history),
            getStateDate('pending', task, history),
            getStateDate('sent', task, history),
            getStateDate('cleared', task, history),
            getStateDate('muted', task, history),
            message.uuid,
            message.sent_by,
            message.to,
            message.message
          ]);
        }), true);
      },
      hydrate: records => {
        const needRegistrations = records.filter(record => {
          return record.scheduled_tasks && record.scheduled_tasks.find(task => !task.messages);
        });

        if (!needRegistrations.length) {
          return records;
        }

        const patientIds = needRegistrations
          .map(record => record.patient && record.patient.patient_id)
          .filter((patientId, idx, self) => patientId && self.indexOf(patientId) === idx);

        if (!patientIds.length) {
          return records;
        }

        return db.medic
          .query('medic-client/registered_patients', { keys: patientIds, include_docs: true })
          .then(result => {
            const registrations = result.rows.filter(row => {
              return registrationUtils.isValidRegistration(row.doc, config.get());
            });

            records.forEach(record => {
              record.registrations = getRecordRegistrations(registrations, record);
            });

            return records;
          });
      }
    });
  }
};
