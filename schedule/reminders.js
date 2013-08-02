var async = require('async'),
    config = require('../config');

module.exports = {
    execute: function(db, callback) {
        var schedules = config.get('schedules');

        async.eachSeries(schedules, function(schedule, callback) {
            module.exports.runSchedule(schedule, db, callback);
        }, callback);
    },
    matchSchedule: function(schedule, db, callback) {
        callback();
    },
    sendReminders: function(message, db, callback) {
        callback();
    },
    runSchedule: function(schedule, db, callback) {
        module.exports.matchSchedule(schedule, db, function(err, matches) {
            var reminder;

            if (err) {
                callback(err);
            } else if (matches) {
                module.exports.sendReminders(schedule.message, db, callback);
            } else {
                callback();
            }
        });
    }
};
