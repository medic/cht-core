var _ = require('underscore'),
    config = require('../config'),
    date = require('../date'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages');

module.exports = {
    // return [hour, minute, timezone]
    getSendTime: function(send_time) {
        if (!send_time) {
            return [];
        }
        var parts = send_time.split(/\s+/),
            time = parts[0].split(':'),
            tz = parts[1];
        return [time[0], time[1], tz];
    },
    getOffset: function(offset) {
        var tokens = (offset || '').split(' '),
            value = tokens[0],
            unit = tokens[1];

        if (/\d+/.test(value) && /(second|minute|hour|day|week|month|year)s?/.test(unit)) {
            return moment.duration(Number(value), unit);
        } else {
            return false;
        }
    },
    getNextTimes: function(doc, now) {
        var first = _.first(doc.scheduled_tasks) || {},
            due = first.due || now,
            times = {};

        if (due && now) {
            _.each(['minutes', 'hours', 'days', 'weeks', 'months', 'years'], function(unit) {
                times[unit] = moment(due).diff(now, unit);
            });
        }
        return times;
    },
    alreadyRun: function(doc, name) {
        var scheduled_task,
            task;

        scheduled_task = _.findWhere(doc.scheduled_tasks, {
            name: name
        });
        task = _.findWhere(doc.tasks, {
            name: name
        });
        return Boolean(scheduled_task || task);
    },
    getScheduleConfig: function(name) {
        var ret;
        _.each(config.get('schedules'), function(schedule) {
            if (schedule.name === name) {
                ret = schedule;
            }
        });
        return ret;
    },
    /*
     * Take doc and schedule config and setup schedule tasks.
     */
    assignSchedule: function(doc, schedule) {
        var self = module.exports,
            docStart,
            start,
            now = moment(date.getDate());

        // if we  can't find the schedule in config, we're done also if forms
        // mismatch or already run.
        if (!_.isObject(schedule) || self.alreadyRun(doc, schedule.name)) {
            return false;
        }

        docStart = utils.getVal(doc, schedule.start_from);

        // if the document does not have the `start_from` property (or its
        // falsey) do nothing; this will be rerun on next document change
        if (typeof docStart === 'undefined') {
            return false;
        }

        // if start_form property is null, we skip schedule creation, but mark
        // transtition as complete.
        if (docStart === null) {
            return true;
        }

        start = moment(docStart);

        _.each(schedule.messages, function(msg) {
            var due,
                locale = utils.getLocale(doc),
                offset = module.exports.getOffset(msg.offset),
                phone = messages.getRecipientPhone(doc, msg.recipient),
                send_time = module.exports.getSendTime(msg.send_time),
                message = messages.getMessage(msg.message, locale);

            if (offset) {
                due = start.clone().add(offset);
                if (send_time.length >= 2) {
                    // set timezone first if specified
                    if (typeof send_time[2] !== 'undefined') {
                        due.zone(send_time[2]);
                    }
                    due.hours(send_time[0]);
                    due.minutes(send_time[1]);
                    // seconds don't matter. force seconds to zero just for
                    // easier testing.
                    due.seconds(0);
                    due.milliseconds(0);
                }
                if (msg.send_day) {
                    due.day(msg.send_day);
                }
                // don't schedule messages in the past or empty messages
                if (due < now || !message) {
                    return;
                }
                messages.scheduleMessage(doc, {
                    due: due.toISOString(),
                    message: message,
                    group: msg.group,
                    type: schedule.name
                }, phone);
            } else {
                // bad offset, skip this msg
                console.error(
                    '%s cannot be parsed as a valid offset. Skipping this msg of %s schedule.', msg.offset, schedule.name
                );
            }
        });

        // if more than zero messages added, return true
        return Boolean(doc.scheduled_tasks && doc.scheduled_tasks.length);

    }
};
