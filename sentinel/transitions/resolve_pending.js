/*
 * transitions/resolve_pending.js
 *
 * This transition sets the state of pending messages to sent.  It is useful
 * during builds where we don't want any outgoing messages queued for sending.
 * It is disabled by default in the default configuration.
 */
var _ = require('underscore'),
    utils = require('../lib/utils');

var getPendingTasks = function(tasks) {
    var ret = [];
    _.each(tasks || [], function(task) {
        if (task.state === 'pending') {
            _.each(task.messages, function(msg) {
                // if to and message is defined then append messages
                if (msg.to && msg.message) {
                    ret.push(task);
                }
            });
        }
    });
    return ret;
};

var getAllPendingTasks = function(doc) {
    var tasks = getPendingTasks(doc.tasks);
    // scheduled tasks are ignored if doc has errors
    if (!doc.errors || doc.errors.length === 0) {
        tasks = tasks.concat(getPendingTasks(doc.scheduled_tasks));
    }
    return tasks;
};

var setStateOnTasks = function(tasks, state) {
    var updated = false;
    state = state || 'sent';
    _.each(tasks, function(task) {
        if (utils.setTaskState(task, state)) {
          updated = true;
        }
    });
    return updated;
};

var onMatch = function(change, db, audit, callback) {
    callback(null, setStateOnTasks(all_pending));
};

var all_pending;
module.exports = {
    onMatch: onMatch,
    filter: function(doc) {
        all_pending = getAllPendingTasks(doc);
        return Boolean(all_pending.length);
    },
    _setStateOnTasks: setStateOnTasks,
    _getPendingTasks: getPendingTasks,
    _getAllPendingTasks: getAllPendingTasks
};
