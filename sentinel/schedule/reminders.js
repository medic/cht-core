var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    messages = require('../lib/messages'),
    later = require('later'),
    moment = require('moment');

// set later to use local time
later.date.localTime();

function isConfigValid(config) {
    return Boolean(
        config.form &&
        config.message &&
        (config.text_expression || config.cron)
    );
}

function getSchedule(config) {
    // fetch a schedule based on the configuration, parsing it as a "cron"
    // or "text" statement see:
    // http://bunkat.github.io/later/parsers.html
    if (!config) {
        return;
    }
    if (config.text_expression) {
        // text expression takes precedence over cron
        return later.schedule(later.parse.text(config.text_expression));
    }
    if (config.cron) {
        return later.schedule(later.parse.cron(config.cron));
    }
}

module.exports = {
    isConfigValid: isConfigValid,
    getSchedule: getSchedule,
    // called from schedule/index.js on the hour, for now
    execute: function(options, callback) {
        var db = options.db,
            reminders = config.get('reminders') || [];

        async.eachSeries(reminders, function(reminder, callback) {
            if (!isConfigValid(reminder)) {
                return callback();
            }
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
            sched = getSchedule(reminder);

        // this will return a moment sometime between the start of the hour and 24 hours ago
        // this is purely for efficiency so we're not always examining a 24 hour stretch
        module.exports.getReminderWindow(options, function(err, end) {
            // this will return either the previous time the schedule schould have run
            // or null if it should not have run in that window.
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

        // if it's already been sent, it will have a matching task with the right form/ts
        send = !_.findWhere(clinic.tasks, {
            form: reminder.form,
            ts: ts.toISOString()
        });

        // if send, check for mute on reminder, and clinic has sent_forms for the reminder
        // sent_forms is maintained by the update_sent_forms transition
        if (send && reminder.mute_after_form_for && clinic.sent_forms && clinic.sent_forms[reminder.form]) {
            lastReceived = moment(clinic.sent_forms[reminder.form]);
            muteDuration = module.exports.parseDuration(reminder.mute_after_form_for);

            if (lastReceived && muteDuration) {
                // if it should mute due to being in the mute duration
                send = ts.isAfter(lastReceived.add(muteDuration));
            }
        }

        return send;
    },
    // returns strings like "1 day" as a moment.duration
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

        // gets all clinics
        db.medic.view('medic-client', 'doc_by_type', {
            startkey: [ 'clinic' ],
            endkey: [ 'clinic', {} ],
            include_docs: true
        }, function(err, data) {
            if (err) {
                return callback(err);
            }
            var docs = _.pluck(data.rows, 'doc');

            // filter them by the canSend function (i.e. not already sent, not
            // on cooldown from having received a form)
            var clinics = _.filter(docs, function(clinic) {
                return module.exports.canSend(options, clinic);
            });

            callback(err, clinics);
        });
    },
    sendReminder: function(options, callback) {
        var clinic = options.clinic,
            db = options.db,
            moment = options.moment,
            reminder = options.reminder,
            context = {
                templateContext: {
                    week: moment.format('w'),
                    year: moment.format('YYYY')
                }
            };

        // add a message to the tasks property with the form/ts markers
        const task = messages.addMessage(clinic, reminder, 'clinic', context);
        if (task) {
            task.form = reminder.form;
            task.ts = moment.toISOString();
            task.type = 'reminder';
        }
        db.medic.insert(clinic, callback);
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

                    // send to the specific clinic
                    module.exports.sendReminder(opts, callback);
                }, callback);
            }
        });
    },
    runReminder: function(options, callback) {
        _.defaults(options, {
            reminder: {}
        });

        // see if the reminder should run in the given window
        module.exports.matchReminder(options, function(err, moment) {
            if (err) {
                callback(err);
            } else if (moment) {
                // if it has a timestamp it should have run at, try and send it
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
            // at the most, look a day back
            floor = now.clone().startOf('hour').subtract(1, 'day'),
            form = options.reminder && options.reminder.form;

        db.medic.view('medic', 'sent_reminders', {
            descending: true,
            limit: 1,
            startkey: [form, now.toISOString()],
            endkey: [form, floor.toISOString()]
        }, function(err, result) {
            var row;

            if (!err) {
                row = _.first(result.rows);

                if (row) {
                    // if there's a result, return that as the floor
                    callback(null, moment(row.key[1]));
                } else {
                    callback(null, floor);
                }
            }
        });
    }
};
