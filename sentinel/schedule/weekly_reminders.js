var _ = require('underscore'),
  epi = require('epi-week'),
  async = require('async'),
  moment = require('moment'),
  db = require('../db'),
  date = require('../date'),
  i18n = require('../i18n'),
  config = require('../config'),
  utils = require('../lib/utils');

/*
 * Setup reminders for the current week unless they are already setup.
 */
function createReminders(options, callback) {

    //console.log('createReminders options',options)

    var day = options.day,
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

                // report was received or reminder already sent
                if (result && (result.received || _.include(result.sent, day))) {
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

            utils.addMessage(doc, {
                phone: phone,
                message: i18n(reminder, {
                    week: week,
                    year: year
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

    // fetch unique list oall clinics
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
 *  To configure this, set the send_weekly_reminders property to something like this:
 *  {
 *    "VPD": {
 *      "3": "Last day to submit a timely VPD report for the previous week.",
 *      "4": "VPD report not received on time; please send previous week's data."
 *    }
 *  }
 *
 *  "VPD" is the form to expect; 3 & 4 are different days to send reminders on.
 *  The values are the messages to send.  {{week}} and {{year}} will be
 *  substituted into the message.
 *
 */
module.exports = function(callback) {
    var day,
        reminders = config.get('send_weekly_reminders'),
        items = [];

    if (!_.isObject(reminders)) {
        console.info('skipping weekly_reminders, config not found.');
        return callback();
    }

    day = date.getDate().getDay();
    _.each(reminders, function(schedule, form) {
        console.info('checking reminders for form %s', form);
        if (_.isObject(schedule)) {
            _.each(schedule, function(reminder, d) {
                if (day === Number(d)) {
                    items.push({
                        form: form,
                        day: d,
                        reminder: reminder
                    });
                } else {
                    console.info('skipped day %s, today is day %s', d, day);
                }
            });
        }
    });

    async.forEach(items, function(item, cb) {
        console.log('processing reminder %s %s', item.form, item.day);
        createReminders(item, cb);
    }, function(err) {
        callback(err);
    });
};
