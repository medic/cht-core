/*
 * transitions/resolve_pending.js
 *
 * This transition sets the state of pending messages to sent.  It is useful
 * during builds where we don't want any outgoing messages queued for sending.
 * It is disabled by default in the default configuration.
 */
const utils = require('../lib/utils');

const NAME = 'resolve_pending';

const getPendingTasks = function(tasks) {
  if (!tasks) {
    return [];
  }
  const ret = [];
  tasks.forEach(task => {
    if (task.state === 'pending') {
      task.messages.forEach(msg => {
        // if to and message is defined then append messages
        if (msg.to && msg.message) {
          ret.push(task);
        }
      });
    }
  });
  return ret;
};

const getAllPendingTasks = function(doc) {
  let tasks = getPendingTasks(doc.tasks);
  // scheduled tasks are ignored if doc has errors
  if (!doc.errors || doc.errors.length === 0) {
    tasks = tasks.concat(getPendingTasks(doc.scheduled_tasks));
  }
  return tasks;
};

const setStateOnTasks = function(tasks, state) {
  state = state || 'sent';
  let updated = false;
  tasks.forEach(task => {
    if (utils.setTaskState(task, state)) {
      task.timestamp = new Date().toISOString();
      updated = true;
    }
  });
  return updated;
};

module.exports = {
  name: NAME,
  filter: ({ doc }) => Boolean(getAllPendingTasks(doc).length),
  onMatch: change => {
    return Promise.resolve(setStateOnTasks(getAllPendingTasks(change.doc)));
  },
  _setStateOnTasks: setStateOnTasks,
  _getPendingTasks: getPendingTasks,
  _getAllPendingTasks: getAllPendingTasks
};
