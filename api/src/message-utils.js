const _ = require('underscore'),
  db = require('./db-pouch'),
  logger = require('./logger'),
  taskUtils = require('task-utils');

const getTaskMessages = function(options, callback) {
  db.medic.query('medic-sms/tasks_messages', options, callback);
};

const getTaskForMessage = function(uuid, doc) {
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

const getTaskAndDocForMessage = function(messageId, docs) {
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
  getMessages: function(options, callback) {
    options = options || {};
    var viewOptions = {
      limit: options.limit || 25,
    };
    if (viewOptions.limit > 1000) {
      return callback({ code: 500, message: 'Limit max is 1000' });
    }
    if (options.state) {
      viewOptions.key = options.state;
    }
    if (options.states) {
      viewOptions.keys = options.states;
    }
    getTaskMessages(viewOptions, function(err, data) {
      if (err) {
        return callback(err);
      }
      var msgs = data.rows.map(function(row) {
        if (typeof row.value.sending_due_date === 'string') {
          row.value.sending_due_date = new Date(
            row.value.sending_due_date
          ).getTime();
        }
        return row.value;
      });
      var sortFunc;
      if (typeof options.descending !== 'undefined') {
        // descending
        sortFunc = (a, b) => b.sending_due_date - a.sending_due_date;
      } else {
        // ascending
        sortFunc = (a, b) => a.sending_due_date - b.sending_due_date;
      }
      msgs.sort(sortFunc);
      callback(null, msgs);
    });
  },
  /*
   * taskStateChanges: an Array of: { messageId, state, details }
   *
   * These state updates are prone to failing due to update conflicts, so this
   * function will retry up to three times for any updates which fail.
   */
  updateMessageTaskStates: function(
    taskStateChanges,
    callback,
    retriesLeft = 3
  ) {
    getTaskMessages(
      { keys: taskStateChanges.map(change => change.messageId) },
      (err, taskMessageResults) => {
        if (err) {
          return callback(err);
        }

        const idsToFetch = _.uniq(_.pluck(taskMessageResults.rows, 'id'));

        db.medic.allDocs(
          { keys: idsToFetch, include_docs: true },
          (err, docResults) => {
            if (err) {
              return callback(err);
            }

            let docs = docResults.rows.map(r => r.doc);

            const stateChangesByDocId = applyTaskStateChangesToDocs(
              taskStateChanges,
              docs
            );
            docs = docs.filter(
              doc =>
                stateChangesByDocId[doc._id] &&
                stateChangesByDocId[doc._id].length
            );

            if (!docs.length) {
              // nothing to update
              return callback(null, { success: true });
            }

            db.medic.bulkDocs(docs, (err, results) => {
              if (err) {
                return callback(err);
              }

              const failures = results.filter(result => !result.ok);
              if (failures.length && !retriesLeft) {
                const failure = `Failed to updateMessageTaskStates: ${JSON.stringify(
                  failures
                )}`;
                logger.error('%o',failure);
                return callback(Error(failure));
              }

              if (failures.length) {
                logger.warn(
                  `Problems with updateMessageTaskStates: ${JSON.stringify(
                    failures
                  )}\n` + `Retrying ${retriesLeft} more times`
                );

                const relevantChanges = _.chain(stateChangesByDocId)
                  .pick(_.pluck(failures, 'id'))
                  .values()
                  .flatten()
                  .value();

                return module.exports.updateMessageTaskStates(
                  relevantChanges,
                  callback,
                  retriesLeft - 1
                );
              }

              callback(null, { success: true });
            });
          }
        );
      }
    );
  },
};
