const logger = require('../logger');
const taskUtils = require('@medic/task-utils');
const db = require('../db');

const resolveMissingUuids = changes => {
  const gatewayRefs = changes
    .map(change => !change.messageId && change.gatewayRef)
    .filter(ref => ref);
  if (!gatewayRefs.length) {
    // all messages have ids
    return Promise.resolve();
  }
  return db.medic.query('medic-sms/messages_by_gateway_ref', { keys: gatewayRefs }).then(res => {
    res.rows.forEach(({ key, value }) => {
      const change = changes.find(({ gatewayRef }) => gatewayRef === key);
      if (change) {
        change.messageId = value;
      }
    });
  });
};

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
        if (taskUtils.setTaskState(task, change.state, change.details, change.gatewayRef)) {
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
   * taskStateChanges: an Array of objects with
   *   - messageId (optional, if gateway_ref provided)
   *   - gatewayRef (optional, if messageId provided)
   *   - state
   *   - details (optional)
   *
   * Returns a Promise to resolve an object with the number of
   *    tasks saved to the database.
   *
   * These state updates are prone to failing due to update conflicts, so this
   * function will retry up to three times for any updates which fail.
   */
  updateMessageTaskStates: (taskStateChanges, retriesLeft=3, successCount=0) => {
    if (!taskStateChanges || !taskStateChanges.length) {
      return Promise.resolve();
    }

    return resolveMissingUuids(taskStateChanges)
      .then(() => {
        const keys = taskStateChanges.map(change => change.messageId);
        return db.medic.query('medic-sms/messages_by_uuid', { keys });
      })
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
          return { saved: successCount };
        }
        return db.medic.bulkDocs(updated).then(results => {
          const failures = results.filter(result => !result.ok);
          successCount += results.length - failures.length;
          if (!failures.length) {
            // all successful
            return { saved: successCount };
          }

          if (!retriesLeft) {
            // at least one failed and we've run out of retries - give up!
            return Promise.reject(new Error(`Failed to updateMessageTaskStates: ${JSON.stringify(failures)}`));
          }

          logger.warn(
            `Problems with updateMessageTaskStates: ${JSON.stringify(failures)}\nRetrying ${retriesLeft} more times.`
          );

          const relevantChanges = [];
          failures.forEach(failure => {
            relevantChanges.push(...stateChangesByDocId[failure.id]);
          });
          return module.exports.updateMessageTaskStates(relevantChanges, --retriesLeft, successCount);
        });
      });
  },
};
