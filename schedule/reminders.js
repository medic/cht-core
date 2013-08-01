var async = require('async'),
    config = require('../config');

function runSchedule(schedule, callback) {
    callback();
}

module.exports = {
    execute: function(db, callback) {
        var schedules = config.get('schedules');

        async.eachSeries(schedules, module.exports.runSchedule, callback);
    },
    runSchedule: function(schedule, callback) {
        callback();
    }
};
