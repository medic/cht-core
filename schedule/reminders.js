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
            callback(null, moment(previous));
        } else {
            callback(null, false);
        }
    },
    getClinics: function(schedule, db, callback) {
        db.view('kujua-lite', 'clinic_by_phone', {
            include_docs: true
        }, function(err, data) {
            var docs = _.pluck(data.rows, 'doc');

            callback(err, docs);
        });
    },
    sendReminders: function(schedule, db, callback) {
        module.exports.getClinics(schedule, db, function(err) {
            callback(err);
        });
    },
    runSchedule: function(schedule, db, callback) {
        module.exports.matchSchedule(schedule, function(err, moment) {
            if (err) {
                callback(err);
            } else if (moment) {
                schedule.moment = moment.clone();
                module.exports.sendReminders(schedule, db, callback);
            } else {
                callback();
            }
        });
    }
};
