const _ = require('underscore'),
      db = require('../db');

const getTaskMessages = function(options, callback) {
  db.medic.view('medic', 'tasks_messages', options, callback);
};

// copied from kujua-utils
// TODO: get rid of this copy once Milan's refactor is complete
// See: https://github.com/medic/medic-webapp/issues/3019
// Specifically, this should be in a new repo that we can pull in via npm
const setTaskState = function(task, state, details) {
  task.state = state;
  task.state_details = details;
  task.state_history = task.state_history || [];
  task.state_history.push({
    state: state,
    state_details: details,
    timestamp: new Date().toISOString()
  });
};

const getTaskForMessage = function(uuid, doc) {
  const getTaskFromMessage = (tasks) => tasks.find(task => {
    if (task.messages) {
      return task.messages.find(message => uuid === message.uuid);
    }
  });

  return getTaskFromMessage(doc.tasks || [], uuid) ||
         getTaskFromMessage(doc.scheduled_tasks || [], uuid);
};


const getTaskAndDocForMessage = function (messageId, docs) {
  for (const doc of docs) {
    const task = getTaskForMessage(messageId, doc);
    if (task) {
      return [task, doc._id];
    }
  }
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
      throw Error('Message id required');
    }

    const [task, docId] = getTaskAndDocForMessage(taskStateChange.messageId, docs);

    if (!task) {
      throw Error(`Message not found: ${taskStateChange.messageId}`);
    }

    fillTaskStateChangeByDocId(taskStateChange, docId);
    setTaskState(task, taskStateChange.state, taskStateChange.details);
  });

  return taskStateChangesByDocId;
};

module.exports = {
  /*
   * Gets a message given an id
   */
  getMessage: function(id, callback) {
    if (!id) {
      return callback({ code: 500, message: 'Missing "id" parameter.' });
    }
    getTaskMessages({ key: id }, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (data.rows.length === 0) {
        return callback({ code: 404, message: 'Not Found' });
      }
      callback(null, data.rows[0].value);
    });
  },
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
          row.value.sending_due_date = new Date(row.value.sending_due_date).getTime();
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
   * See: updateMessageTaskStates
   */
  updateMessageTaskState: function(taskStateChange, callback) {
    module.exports.updateMessageTaskStates([taskStateChange], callback);
  },
  /*
   * taskStateChanges: a collection of:
   * {
   *  messageId, state, details
   * }
   */
  updateMessageTaskStates: function(taskStateChanges, callback, retriesLeft=3) {
    getTaskMessages({ keys: taskStateChanges.map(change => change.messageId)}, (err, taskMessageResults) => {
      if (err) {
        return callback(err);
      }

      const idsToFetch = _.uniq(_.pluck(taskMessageResults.rows, 'id'));

      db.medic.fetch({keys: idsToFetch}, (err, docResults) => {
        const docs = _.pluck(docResults.rows, 'doc');

        let stateChangesByDocId;
        try {
          stateChangesByDocId = applyTaskStateChangesToDocs(taskStateChanges, docs);
        } catch (err) {
          return callback(err);
        }

        db.medic.bulk({docs: docs}, (err, results) => {
          if (err) {
            return callback(err);
          }

          const failures = results.filter(result => !result.ok);
          if (failures.length && !retriesLeft) {
            const failure = `Failed to updateMessageTaskStates: ${JSON.stringify(failures)}`;
            console.error(failure);
            return callback(Error(failure));
          }

          if (failures.length) {
            console.warn(
              `Problems with updateMessageTaskStates: ${JSON.stringify(failures)}\n` +
              `Retrying ${retriesLeft} more times`);

            const relevantChanges = _.chain(stateChangesByDocId)
                                     .pick(_.pluck(failures, 'id'))
                                     .values()
                                     .flatten()
                                     .value();

            return module.exports.updateMessageTaskStates(
              relevantChanges,
              callback,
              retriesLeft - 1);
          }

          callback(null, {success: true});
        });
      });
    });
  }
};
