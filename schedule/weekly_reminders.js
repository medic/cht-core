var _ = require('underscore'),
  epi = require('epi-week'),
  async = require('async'),
  moment = require('moment'),
  date = require('../date'),
  i18n = require('../i18n'),
  config = require('../config'),
  utils = require('../lib/utils');

/*
 * Setup reminders for the current week unless they are already setup.
 */
function createReminders(options, callback) {
    var day = options.day,
        db = require('../db'),
        form = options.form,
        reminder = options.reminder,
        epiWeek,
        week,
        lastWeek = moment(date.getDate()),
        year;

    // previous CDC week is the previous Sunday
    lastWeek.subtract('weeks', 1);
    epiWeek = epi(lastWeek.toDate());
    week = epiWeek.week;
    year = epiWeek.year;

    function finalize(err) {
        callback(err);
    }

    function setupReminder(recipient, callback) {

        var phone = recipient && recipient.contact && recipient.contact.phone,
            refid = recipient && recipient.contact && recipient.contact.rc_code;

        // we can't setup reminder if clinic has no phone number
        if (!phone) {
            console.warn('skipping reminder, missing phone number.', recipient);
            return callback();
        }

        function checkDups(callback) {
            db.view('kujua-sentinel', 'weekly_reminders', {
                group: true,
                key: [form, year, week, phone],
                limit: 1
            }, function(err, data) {

                if (err) {
                    return callback(err);
                }

                var doc,
                    row = _.first(data.rows),
                    result = row && row.value;

                if (result && (result.received || _.include(result.sent, day))) {
                    console.info('report received or reminder already sent for', form, year, week, phone);
                    return callback(null, result);
                }

                callback();
            });
        }


        function create(err, dups) {

            if (err) {
                return callback(err);
            }

            if (dups) {
                // skip creation of this reminder
                return callback();
            }

            var doc = {
                day: day,
                related_entities: {clinic: recipient},
                related_form: form,
                phone: phone,
                refid: refid,
                type: 'weekly_reminder',
                week: week,
                year: year
            };

            // {{week}}, {{year}} and {{form}} will be substituted into the
            // message.
            utils.addMessage(doc, {
                phone: phone,
                message: i18n(reminder, {
                    week: week,
                    year: year,
                    form: form
                })
            });

            db.saveDoc(doc, function(err, ok) {
                if (err) {
                    console.error('Failed to save weekly reminder', err.reason);
                } else {
                    console.info('Created weekly reminder', ok.id)
                }
                callback(err);
            });

        }

        checkDups(create);

    }

    // fetch unique list of all clinics
    db.view('kujua-sentinel', 'clinic_by_phone', {include_docs: true}, function(err, data) {

        if (err) {
            console.error("Could not run view: " + err.reason);
            return callback(err);
        }

        var recipients = _.pluck(data.rows, 'doc');

        // pass recipients to setupReminder in series so we can avoid sending
        // the same reminder more than once to a phone.
        async.eachSeries(recipients, setupReminder, finalize);
    });
}

/**
 * Setup weekly reminders
 *
 *  To configure this, set the weekly_reminders value to something like this:
 *
 *  [{
 *    form: 'VPD',
 *    day: 'Tuesday',
 *    message: 'Please submit last week\'s {{form}} report immediately.'
 *  }]
 *
 *  "VPD" is the form to expect; message will be sent on day.  {{week}},
 *  {{year}} and {{form}} will be substituted into the message.
 *
 */
module.exports = function(db, callback) {
    var day,
        reminders = config.get('weekly_reminders'),
        items = [];

    // map js day number to string
    var days = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
    };

    if (!_.isObject(reminders)) {
        console.info('skipping weekly_reminders, config not found.');
        return callback();
    }

    day = date.getDate().getDay();

    _.each(reminders, function(reminder, idx) {

        if (!reminder || !reminder.form || !reminder.day || !reminder.message) {
            return;
        }

        // if day matches then setup reminder
        if (days[day].match(RegExp(reminder.day, 'i'))) {
            items.push({
                form: reminder.form,
                day: reminder.day,
                reminder: reminder.message
            });
        } else {
            console.info(
                'skipped %s reminder, today is %s', reminder.day, days[day]
            );
        }

    });

    async.forEach(items, function(item, cb) {
        console.log('processing reminder config %s %s', item.form, item.day);
        createReminders(item, cb);
    }, function(err) {
        callback(err);
    });
};
