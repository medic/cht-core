var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    later = require('later'),
    moment = require('moment');

// set later to use local time
later.date.localTime();

module.exports = {
    execute: function(db, callback) {
        var schedules = config.get('schedules');

        async.eachSeries(schedules, function(schedule, callback) {
            module.exports.runSchedule(schedule, db, callback);
        }, callback);
    },
    // matches from "now" to the start of the last hour
    // later reverses time ranges fro later#prev searches
    matchSchedule: function(schedule, callback) {
        var start = moment(),
            end = start.clone().startOf('hour').subtract(1, 'hour'),
            sched = later.schedule(later.parse.cron(schedule.cron)),
            previous = sched.prev(1, start.toDate(), end.toDate());

        if (_.isDate(previous)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    sendReminders: function(message, db, callback) {
        callback();
    },
    runSchedule: function(schedule, db, callback) {
        module.exports.matchSchedule(schedule, function(err, matches) {
            if (err) {
                callback(err);
            } else if (matches) {
                module.exports.sendReminders(schedule, db, callback);
            } else {
                callback();
            }
        });
    }
};
