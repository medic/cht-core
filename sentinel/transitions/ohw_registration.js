var _ = require('underscore'),
    moment = require('moment'),
    date = require('../date'),
    config = require('../config'),
    ids = require('../lib/ids'),
    utils = require('../lib/utils'),
    i18n = require('../i18n');

module.exports = {
    onMatch: function(change, callback) {
        var doc = change.doc,
            self = module.exports;

        self.setId(doc, function() {
            var expected,
                lmp,
                weeks = Number(doc.last_menstrual_period);

            if (_.isNumber(weeks)) {
                lmp = moment(date.getDate()).startOf('day').startOf('week').subtract('weeks', weeks);
                expected = lmp.clone().add('weeks', 40);
                _.extend(doc, {
                    lmp_date: lmp.valueOf(),
                    expected_date: expected.valueOf()
                });
                self.scheduleReminders(doc, lmp, expected);
                self.addAcknowledgement(doc);
                callback(null, true);
            } else {
                callback(null, false);
            }
        });

    },
    setId: function(doc, callback) {
        var id = ids.generate(doc.serial_number),
            self = module.exports;

        utils.getOHWRegistration(id, function(err, found) {
            if (err) {
                callback(err);
            } else if (found) {
                self.setId(doc, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    },
    addAcknowledgement: function(doc) {
        var duration,
            visit = utils.findScheduledMessage(doc, 'anc_visit'),
            clinicName = utils.getClinicName(doc);

        if (visit) {
            duration = moment.duration(visit.due - moment().valueOf());
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n(
                    "Thank you {{clinicName}} for registering {{serial_number}}."
                    + " Patient ID is {{patient_id}}. ANC visit is needed in"
                    + " {{weeks}} weeks.", {
                        clinicName: clinicName,
                        patient_id: doc.patient_id,
                        serial_number: doc.serial_number,
                        weeks: Math.round(duration.asWeeks())
                    }
                )
            });
        } else {
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n("Thank you for registering {{serial_number}}. Patient ID is {{patient_id}}.", {
                    patient_id: doc.patient_id,
                    serial_number: doc.serial_number
                })
            });
        }
    },
    scheduleReminders: function(doc, lmp, expected) {
        var clinicContactName = utils.getClinicContactName(doc),
            clinicName = utils.getClinicName(doc),
            now = moment(date.getDate());

        // options can be a number or an object like:
        // {
        //      days: 39,
        //      message: 'foo',
        //      time_key: 'weeks' // days by default
        // }
        function addMessage(options) {

            if (!options)
                return console.error('addMessage failed.', options);

            var time_key = options.time_key || 'days',
                offset = options['time_key'] || options,
                number = options.number || null,
                type = options.type || 'anc_visit',
                message = options.message ||
                    'Greetings, {{contact_name}}. {{serial_number}} is due for a'
                    + ' visit soon.';

            var due = lmp.clone().add(time_key, offset);

            if (due > now)
                return;

            utils.addScheduledMessage(doc, {
                due: due.valueOf(),
                message: i18n(message, {
                    contact_name: clinicContactName,
                    clinic_name: clinicName,
                    serial_number: doc.serial_number,
                    patient_id: doc.patient_id
                }),
                number: number,
                phone: doc.from,
                type: type
            });

        };

        // anc schedule reminders weeks
        _.each(config.get('ohw_anc_reminder_schedule_weeks'), function(data, i) {
            if (parseInt(data,10))
                data = {weeks: data};
            addMessage(
                _.extend({
                    time_key: 'weeks',
                    number: i + 1,
                    message: 'Greetings, {{contact_name}}. {{serial_number}} is'
                        + ' due for an ANC visit this week.'
                }, data)
            );
        });

        // anc schedule reminders days
        _.each(config.get('ohw_anc_reminder_schedule_days'), function(data, i) {
            if (parseInt(data,10))
                data = {days: data};
            addMessage(
                _.extend({
                    number: i + 1,
                    message: 'Greetings, {{contact_name}}. {{serial_number}} is'
                        + ' due for an ANC visit this week.'
                }, data)
            );
        });


        // misoprostol reminder
        _.each(config.get('ohw_miso_reminder_days'), function(data, i) {
            if (parseInt(data,10))
                data = {days: data};
            var msg = "Greetings, {{contact_name}}. It's now {{serial_number}}'s 8th "
                + "month of pregnancy. If you haven't given Miso, please "
                + "distribute. Make birth plan now. Thank you!";
            addMessage(
                _.extend({
                    type: 'miso_reminder',
                    message: msg
                }, data)
            );
        });

        // upcoming delivery reminder
        _.each(config.get('ohw_upcoming_delivery_weeks'), function(data, i) {
            if (parseInt(data,10))
                data = {weeks: data};
            var msg = "Greetings, {{contact_name}}. {{serial_number}} is due to deliver soon.";
            addMessage(
                _.extend({
                    time_key: 'weeks',
                    type: 'upcoming_delivery',
                    message: msg
                }, data)
            );
        });

        // outcome request reminder
        _.each(config.get('ohw_outcome_request_weeks'), function(data, i) {
            if (parseInt(data,10))
                data = {weeks: data};
            var msg = "Greetings, {{contact_name}}. Please submit the birth"
                + " report for {{serial_number}}.";
            addMessage(
                _.extend({
                    time_key: 'weeks',
                    type: 'outcome_request',
                    message: msg
                }, data)
            );
        });

        // outcome request reminder (days)
        _.each(config.get('ohw_outcome_request_days'), function(data, i) {
            if (parseInt(data,10))
                data = {days: data};
            var msg = "Greetings, {{contact_name}}. Please submit the birth"
                + " report for {{serial_number}}.";
            addMessage(
                _.extend({
                    type: 'outcome_request',
                    message: msg
                }, data)
            );
        });

        // counseling reminder
        _.each(config.get('ohw_counseling_reminder_days'), function(data, i) {
            if (parseInt(data,10))
                data = {days: data};
            var msg = 'Greetings, {{contact_name}}. This is a reminder to'
                + 'submit your counseling report for {{serial_number}}.';
            addMessage(
                _.extend({
                    type: 'counseling_reminder',
                    message: msg
                }, data)
            );
        });
    }
};
