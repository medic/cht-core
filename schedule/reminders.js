var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    utils = require('../lib/utils'),
    i18n = require('../i18n'),
    later = require('later'),
    moment = require('moment');

// set later to use local time
later.date.localTime();

module.exports = {
    execute: function(db, callback) {
        var schedules = config.get('schedules');

        async.eachSeries(schedules, function(schedule, callback) {
            module.exports.runSchedule({
                db: db,
                schedule: schedule
            }, callback);
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
    isSent: function(schedule, clinic) {
        var sent;

        schedule.moment = schedule.moment || moment().startOf('hour');

        sent = _.findWhere(clinic.tasks, {
            code: schedule.code,
            ts: schedule.moment.toISOString()
        });

        return !!sent;
    },
    getClinics: function(options, callback) {
        var db = options.db,
            schedule = options.schedule;

        db.view('kujua-lite', 'clinic_by_phone', {
            include_docs: true
        }, function(err, data) {
            var clinics,
                docs = _.pluck(data.rows, 'doc');

            clinics = _.reject(docs, function(clinic) {
                return module.exports.isSent(schedule, clinic);
            });

            callback(err, clinics);
        });
    },
    sendReminder: function(options, callback) {
        var clinic = options.clinic,
            db = options.db,
            moment = options.moment,
            schedule = options.schedule;

        utils.addMessage(clinic, {
            code: schedule.code,
            ts: moment.toISOString(),
            phone: utils.getClinicPhone(clinic),
            message: i18n(schedule.message, {
                week: moment.format('w'),
                year: moment.format('YYYY')
            })
        });

        db.saveDoc(clinic, callback);
    },
    sendReminders: function(options, callback) {
        module.exports.getClinics(options, function(err, clinics) {
            if (err) {
                callback(err);
            } else {
                async.each(clinics, function(clinic, callback) {
                    var opts = _.extend({}, options, {
                        clinic: clinic
                    });

                    module.exports.sendReminder(opts, callback);
                }, callback);
            }
        });
    },
    runSchedule: function(options, callback) {
        _.defaults(options, {
            schedule: {}
        });

        module.exports.matchSchedule(options.schedule, function(err, moment) {
            if (err) {
                callback(err);
            } else if (moment) {
                options.moment = moment.clone();
                module.exports.sendReminders(options, callback);
            } else {
                callback();
            }
        });
    }
};
