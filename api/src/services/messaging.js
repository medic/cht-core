const _ = require('underscore');
const taskUtils = require('@medic/task-utils');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');

const getTaskForMessage = (uuid, doc) => {
  const getTaskFromMessage = tasks =>
    tasks.find(task => {
      if (task.messages) {
        return task.messages.find(message => uuid === message.uuid);
      }
    });

  return (
    getTaskFromMessage(doc.tasks || [], uuid) ||
    getTaskFromMessage(doc.scheduled_tasks || [], uuid)
  );
};

const getTaskAndDocForMessage = (messageId, docs) => {
  for (const doc of docs) {
    const task = getTaskForMessage(messageId, doc);
    if (task) {
      return { task: task, docId: doc._id };
    }
  }
  return {};
};

/*
 * Applies (in-place) state changes to a given collection of docs.
 *
 * Also returns a map of docId -> taskStateChanges
*/
// TODO replace this with functional style
const applyTaskStateChangesToDocs = (taskStateChanges, docs) => {
  const taskStateChangesByDocId = {};
  const fillTaskStateChangeByDocId = (taskStateChange, docId) => {
    if (!taskStateChangesByDocId[docId]) {
      taskStateChangesByDocId[docId] = [];
    }
    taskStateChangesByDocId[docId].push(taskStateChange);
  };

  taskStateChanges.forEach(taskStateChange => {
    if (!taskStateChange.messageId) {
      return logger.error(`Message id required: ${taskStateChange}`);
    }

    const { task, docId } = getTaskAndDocForMessage(
      taskStateChange.messageId,
      docs
    );

    if (!task) {
      return logger.error(`Message not found: ${taskStateChange.messageId}`);
    }

    if (
      taskUtils.setTaskState(
        task,
        taskStateChange.state,
        taskStateChange.details
      )
    ) {
      fillTaskStateChangeByDocId(taskStateChange, docId);
    }
  });

  return taskStateChangesByDocId;
};

module.exports = {
  /*
   * Returns `options.limit` messages, optionally filtering by state.
   */
  getMessages: (options={}) => {
    const viewOptions = {
      limit: options.limit || 25,
    };
    if (viewOptions.limit > 1000) {
      return Promise.reject({ code: 500, message: 'Limit max is 1000' });
    }
    if (options.state) {
      viewOptions.key = options.state;
    }
    if (options.states) {
      viewOptions.keys = options.states;
    }
    return db.medic.query('medic-sms/tasks_messages', viewOptions).then(data => {
      const msgs = data.rows.map(row => {
        if (typeof row.value.sending_due_date === 'string') {
          row.value.sending_due_date = new Date(row.value.sending_due_date).getTime();
        }
        return row.value;
      });
      let sortFunc;
      if (typeof options.descending !== 'undefined') {
        // descending
        sortFunc = (a, b) => b.sending_due_date - a.sending_due_date;
      } else {
        // ascending
        sortFunc = (a, b) => a.sending_due_date - b.sending_due_date;
      }
      msgs.sort(sortFunc);
      return msgs;
    });
  },
  /*
   * taskStateChanges: an Array of: { messageId, state, details }
   *
   * These state updates are prone to failing due to update conflicts, so this
   * function will retry up to three times for any updates which fail.
   */
  updateMessageTaskStates: (taskStateChanges, retriesLeft=3) => {
    const options = {
      keys: taskStateChanges.map(change => change.messageId)
    };
    return db.medic.query('medic-sms/tasks_messages', options)
      .then(results => {
        const idsToFetch = _.uniq(_.pluck(results.rows, 'id'));
        return db.medic.allDocs({ keys: idsToFetch, include_docs: true });
      })
      .then(results => {
        let docs = results.rows.map(r => r.doc);

        const stateChangesByDocId = applyTaskStateChangesToDocs(taskStateChanges, docs);

        docs = docs.filter(doc => stateChangesByDocId[doc._id] && stateChangesByDocId[doc._id].length);

        if (!docs.length) {
          // nothing to update
          return;
        }
        return db.medic.bulkDocs(docs)
          .then(results => {
            const failures = results.filter(result => !result.ok);
            if (!failures.length) {
              // all successful
              return;
            }

            if (!retriesLeft) {
              // at least one failed and we've run out of retries - give up!
              return Promise.reject(new Error(`Failed to updateMessageTaskStates: ${JSON.stringify(failures)}`));
            }

            logger.warn(`Problems with updateMessageTaskStates: ${JSON.stringify(failures)}\nRetrying ${retriesLeft} more times.`);

            const relevantChanges = _.chain(stateChangesByDocId)
              .pick(_.pluck(failures, 'id'))
              .values()
              .flatten()
              .value();

            return module.exports.updateMessageTaskStates(relevantChanges, --retriesLeft);
        });
      });
  },
  /**
   * Returns true if the given messaging service id matches what is configured.
   * We don't want to get into the situation of two services sending the same
   * message.
   */
  isEnabled: id => {
    const settings = config.get('sms') || {};
    return settings.outgoing_service === id;
  }
};
