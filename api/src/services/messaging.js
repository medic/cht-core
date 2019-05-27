const taskUtils = require('@medic/task-utils');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');

const getTaskFromMessage = (tasks, uuid) => {
  return tasks && tasks.find(task => {
    return task.messages && task.messages.find(message => uuid === message.uuid);
  });
};

const getTaskForMessage = (uuid, doc) => {
  return getTaskFromMessage(doc.tasks, uuid) ||
         getTaskFromMessage(doc.scheduled_tasks, uuid);
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
const applyTaskStateChangesToDocs = (taskStateChanges, docs) => {
  return taskStateChanges.reduce((memo, change) => {
    if (!change.messageId) {
      logger.error(`Message id required: ${JSON.stringify(change)}`);
    } else {
      const { task, docId } = getTaskAndDocForMessage(change.messageId, docs);
      if (!task) {
        logger.error(`Message not found: ${change.messageId}`);
      } else {
        if (taskUtils.setTaskState(task, change.state, change.details)) {
          if (!memo[docId]) {
            memo[docId] = [];
          }
          memo[docId].push(change);
        }
      }
    }
    return memo;
  }, {});
};

module.exports = {
  /*
   * Returns `options.limit` messages, optionally filtering by state.
   */
  getMessages: ({limit=25, state}={}) => {
    if (limit > 1000) {
      return Promise.reject({ code: 500, message: 'Limit max is 1000' });
    }
    const viewOptions = { limit };
    if (state) {
      viewOptions.startkey = [ state, 0 ];
      viewOptions.endkey = [ state, '\ufff0' ];
    }
    return db.medic.query('medic-sms/messages_by_state', viewOptions)
      .then(data => data.rows.map(row => row.value));
  },
  /*
   * taskStateChanges: an Array of: { messageId, state, details }
   *
   * These state updates are prone to failing due to update conflicts, so this
   * function will retry up to three times for any updates which fail.
   */
  updateMessageTaskStates: (taskStateChanges, retriesLeft=3) => {
    const options = { keys: taskStateChanges.map(change => change.messageId) };
    return db.medic.query('medic-sms/messages_by_uuid', options)
      .then(results => {
        const uniqueIds = [...new Set(results.rows.map(row => row.id))];
        return db.medic.allDocs({ keys: uniqueIds, include_docs: true });
      })
      .then(results => {
        const docs = results.rows.map(r => r.doc);
        const stateChangesByDocId = applyTaskStateChangesToDocs(taskStateChanges, docs);
        const updated = docs.filter(doc => stateChangesByDocId[doc._id] && stateChangesByDocId[doc._id].length);

        if (!updated.length) {
          // nothing to update
          return;
        }
        return db.medic.bulkDocs(updated).then(results => {
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

          const relevantChanges = [];
          failures.forEach(failure => {
            relevantChanges.push(...stateChangesByDocId[failure.id]);
          });
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
