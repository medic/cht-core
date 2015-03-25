/*
 * transitions/resolve_pending.js
 *
 * This transition sets the state of pending messages to sent.  It is useful
 * during builds where we don't want any outgoing messages queued for sending.
 * It is disabled by default in the default configuration.
 */
var _ = require('underscore'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger');

var getPendingTasks = function(doc) {
    var tasks = [];
    _.each(doc.tasks, function(task) {
        if (task.state === 'pending') {
            _.each(task.messages, function(msg) {
                // if to and message is defined then append messages
                if (msg.to && msg.message) {
                    tasks.push(task);
                }
            });
        }
    });
    // scheduled tasks are ignored if doc has errors
    if (!doc.errors || doc.errors.length === 0) {
        _.each(doc.scheduled_tasks || [], function(task) {
            if (task.state === 'pending') {
                _.each(task.messages, function(msg) {
                    // if to and message is defined then append messages
                    if (msg.to && msg.message) {
                        tasks.push(task);
                    }
                });
            }
        });
    }
    return tasks;
};

var setStateOnTasks = function(tasks, state) {
    var updated;
    state = state || 'sent';
    _.each(tasks, function(task) {
        utils.setTaskState(task, 'sent');
        task.timestamp = new Date().toISOString();
        updated = true;
    });
    return updated;
};

var onMatch = function(change, db, audit, callback) {
    var doc = change.doc,
        updated = setStateOnTasks(all_pending);
    if (updated) {
        return callback(null, true);
    } else {
        callback();
    }
};

var all_pending;
module.exports = {
    filter: function(doc) {
        all_pending = getPendingTasks(doc);
        return Boolean(all_pending.length);
    },
    _setStateOnTasks: setStateOnTasks,
    _getPendingTasks: getPendingTasks,
    onMatch: onMatch
};
