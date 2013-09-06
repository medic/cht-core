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
    execute: function(options, callback) {
        var db = options.db,
            reminders = config.get('reminders') || [];

        async.eachSeries(reminders, function(reminder, callback) {
            module.exports.runReminder({
                db: db,
                reminder: reminder
            }, callback);
        }, callback);
    },
    // matches from "now" to the start of the last hour
    // later reverses time ranges fro later#prev searches
    matchReminder: function(options, callback) {
        var start = moment(),
            reminder = options.reminder,
            sched = later.schedule(later.parse.cron(reminder.cron));

        module.exports.getReminderWindow(options, function(err, end) {
            var previous = sched.prev(1, start.toDate(), end.toDate());
            if (_.isDate(previous)) {
                callback(null, moment(previous));
            } else {
                callback(null, false);
            }
        });
    },
    canSend: function(options, clinic) {
        var send,
            ts = options.moment || moment().startOf('hour'),
            reminder = options.reminder,
            lastReceived,
            muteDuration;

        send = !_.findWhere(clinic.tasks, {
            form: reminder.form,
            ts: ts.toISOString()
        });

        // if send, check for mute on reminder, and clinic has sent_forms for the reminder
        if (send && reminder.mute_after_form_for && clinic.sent_forms && clinic.sent_forms[reminder.form]) {
            lastReceived = moment(clinic.sent_forms[reminder.form]);
            muteDuration = module.exports.parseDuration(reminder.mute_after_form_for);

            if (lastReceived && muteDuration) {
                send = ts.isAfter(lastReceived.add(muteDuration));
            }
        }

        return send;
    },
    parseDuration: function(format) {
        var tokens;

        if (/^\d+ (minute|day|hour|week)s?$/.test(format)) {
            tokens = format.split(' ');

            return moment.duration(Number(tokens[0]), tokens[1]);
        } else {
            return null;
        }
    },
    getClinics: function(options, callback) {
        var db = options.db;

        db.view('kujua-lite', 'clinic_by_phone', {
            include_docs: true
        }, function(err, data) {
            var clinics,
                docs = _.pluck(data.rows, 'doc');

            clinics = _.filter(docs, function(clinic) {
                return module.exports.canSend(options, clinic);
            });

            callback(err, clinics);
        });
    },
    sendReminder: function(options, callback) {
        var clinic = options.clinic,
            db = options.db,
            moment = options.moment,
            reminder = options.reminder;

        utils.addMessage(clinic, {
            form: reminder.form,
            ts: moment.toISOString(),
            phone: utils.getClinicPhone(clinic),
            message: i18n(reminder.message, {
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
    runReminder: function(options, callback) {
        _.defaults(options, {
            reminder: {}
        });

        module.exports.matchReminder(options, function(err, moment) {
            if (err) {
                callback(err);
            } else if (moment) {
                options.moment = moment.clone();
                module.exports.sendReminders(options, callback);
            } else {
                callback();
            }
        });
    },
    getReminderWindow: function(options, callback) {
        var db = options.db,
            now = moment(),
            floor = now.clone().startOf('hour').subtract(1, 'day'),
            form = options.reminder && options.reminder.form;

        db.view('kujua-lite', 'sent_reminders', {
            descending: true,
            limit: 1,
            startkey: [form, now.toISOString()],
            endkey: [form, floor.toISOString()]
        }, function(err, result) {
            var row = _.first(result.rows);

            if (row) {
                callback(null, moment(row.key[1]));
            } else {
                callback(null, floor);
            }
        });
    }
};
