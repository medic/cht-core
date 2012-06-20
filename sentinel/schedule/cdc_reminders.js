var _ = require('underscore'),
  db = require('../db'),
  date = require('../date'),
  epi = require('epi-week'),
  i18n = require('../i18n'),
  config = require('../config'),
  utils = require('../lib/utils');

function sendReminders(form, day, reminder) {
  var epiWeek,
      week,
      lastWeek = date.getDate(),
      year;
  // previous CDC week is the previous Sunday
  lastWeek.setDate(lastWeek.getDate() - (lastWeek.getDay() + 1));

  epiWeek = epi(lastWeek);
  week = epiWeek.week;
  year = epiWeek.year;

  db.view('kujua-base', 'clinic_by_phone', function(err, data) {
    if (err) {
      console.error("Could not run view: " + err.reason);
      return;
    }
    var recipients = _.pluck(data.rows, 'value');
    _.each(recipients, function(recipient) {
      var phone = recipient && recipient.contact && recipient.contact.phone;

      db.view('kujua-sentinel', 'cdc_reports', {
        group: true,
        key: [form, phone, year, week],
        limit: 1
      }, function(err, data) {
        if (err) {
          console.error("Could not run view: " + err.reason);
          return;
        }
        var doc,
            row = _.first(data.rows),
            result = row && row.value;
        if (!result || (!result.received && !_.include(result.sent, day))) {
          doc = {
            day: day,
            related_form: form,
            phone: phone,
            type: 'cdc_reminder',
            week: week,
            year: year
          };
          utils.addMessage(doc, phone, i18n(reminder, {
            week: week,
            year: year
          }));
          db.saveDoc(doc, function(err, ok) {
            if (err) {
              console.error("Could not add reminder: " + err.reason);
            }
          });
        }
      });
    });
  });
}

/**
 *  To configure this, set the cdc_send_reminders property to something like this:
 *  {
 *    "VPD": {
 *      "3": "Last day to submit a timely VPD report for the previous week.",
 *      "4": "VPD report not received on time; please send previous week’s data."
 *    }
 *  }
 *
 *  "VPD" is the form to expect; 3 & 4 are different days to send reminders on. The values are the messages to send.
 *  {{week}} and {{year}} will be substituted into the message.
 *
 */
module.exports = function() {
  var day,
      reminders = config.get('cdc_send_reminders');

  if (_.isObject(reminders)) {
    day = date.getDate().getDay();
    _.each(reminders, function(schedule, form) {
      if (_.isObject(schedule)) {
        _.each(schedule, function(reminder, d) {
          if (day === Number(d)) {
            sendReminders(form, d, reminder);
          }
        });
      }
    });
  }
}
