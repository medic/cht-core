var _ = require('underscore'),
    moment = require('moment'),
    date = require('../date'),
    config = require('../config'),
    ids = require('../lib/ids'),
    utils = require('../lib/utils'),
    i18n = require('../i18n');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            self = module.exports;

        self.validate(doc, function(err) {

            // validation failed, finalize transition
            if (err) return callback(null, true);

            self.setId(doc, function() {
                var expected,
                    lmp,
                    weeks = Number(doc.last_menstrual_period);
                lmp = moment(date.getDate()).startOf('day').startOf('week').subtract('weeks', weeks);
                expected = lmp.clone().add('weeks', 40);
                _.extend(doc, {
                    lmp_date: lmp.valueOf(),
                    expected_date: expected.valueOf()
                });
                self.scheduleReminders(doc, lmp, expected);
                self.addAcknowledgement(doc);
                callback(null, true);
            });
        });

    },
    validate: function(doc, callback) {
        var weeks = Number(doc.last_menstrual_period);
        if (!_.isNumber(weeks)) {
            var msg = 'Failed to parse LMP.';
            utils.addError(doc, { message: msg });
            // TODO add message/response for reporter here
            return callback(msg);
        }
        var opts = {
            doc:doc,
            time_key: 'months',
            time_val: 12,
            type:'serial_number'
        };
        utils.handleDuplicates(opts, function(err) {
            if (err) return callback(err);
            callback();
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
            clinicContactName = utils.getClinicContactName(doc),
            clinicName = utils.getClinicName(doc);

        if (visit) {
            duration = moment.duration(visit.due - date.getTimestamp());
            utils.addMessage(doc, {
                phone: doc.from,
                message: i18n(
                    "Thank you {{contact_name}} for registering {{serial_number}}."
                    + " Patient ID is {{patient_id}}. ANC visit is needed in"
                    + " {{weeks}} weeks.", {
                        clinic_name: clinicName,
                        contact_name: clinicContactName,
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

            if (!options) return console.error('addMessage failed.', options);

            var time_key = options.time_key || 'days',
                offset = options[time_key] || options,
                message = options.message ||
                    'Greetings, {{contact_name}}. {{serial_number}} is due for a'
                    + ' visit soon.';

            var due = lmp.clone().add(time_key, offset);

            if (due < now)
                return;

            utils.addScheduledMessage(doc, {
                due: due.valueOf(),
                message: i18n(message, {
                    contact_name: clinicContactName,
                    clinic_name: clinicName,
                    serial_number: doc.serial_number,
                    patient_id: doc.patient_id
                }),
                group: options.group,
                phone: doc.from,
                type: options.type
            });

        };

        // anc schedule reminders weeks
        _.each(config.get('ohw_reminder_schedule_weeks'), function(data, i) {
            if (_.isNumber(data))
                data = {weeks: data};
            addMessage(
                _.extend({
                    time_key: 'weeks',
                    group: data.group,
                    type: data.type || 'anc_visit',
                    message: 'Greetings, {{contact_name}}. {{serial_number}} is'
                        + ' due for an ANC visit this week.'
                }, data)
            );
        });

        // anc schedule reminders days
        _.each(config.get('ohw_reminder_schedule_days'), function(data, i) {
            if (_.isNumber(data))
                data = {days: data};
            addMessage(
                _.extend({
                    group: data.group,
                    type: data.type || 'anc_visit',
                    message: 'Greetings, {{contact_name}}. {{serial_number}} is'
                        + ' due for an ANC visit this week.'
                }, data)
            );
        });


        // misoprostol reminder
        _.each(config.get('ohw_miso_reminder_days'), function(data, i) {
            if (_.isNumber(data))
                data = {days: data};
            var msg = "Greetings, {{contact_name}}. It's now {{serial_number}}'s 8th "
                + "month of pregnancy. If you haven't given Miso, please "
                + "distribute. Make birth plan now. Thank you!";
            addMessage(
                _.extend({
                    group: data.group,
                    type: 'miso_reminder',
                    message: msg
                }, data)
            );
        });

        // upcoming delivery reminder
        _.each(config.get('ohw_upcoming_delivery_days'), function(data, i) {
            if (_.isNumber(data))
                data = {days: data};
            var msg = "Greetings, {{contact_name}}. {{serial_number}} is due to deliver soon.";
            addMessage(
                _.extend({
                    group: data.group,
                    type: 'upcoming_delivery',
                    message: msg
                }, data)
            );
        });

        // outcome request reminder
        _.each(config.get('ohw_outcome_request_weeks'), function(data, i) {
            if (_.isNumber(data))
                data = {weeks: data};
            var msg = "Greetings, {{contact_name}}. Please submit the birth"
                + " report for {{serial_number}}.";
            addMessage(
                _.extend({
                    group: data.group,
                    time_key: 'weeks',
                    type: 'outcome_request',
                    message: msg
                }, data)
            );
        });

        // outcome request reminder (days)
        _.each(config.get('ohw_outcome_request_days'), function(data, i) {
            if (_.isNumber(data))
                data = {days: data};
            var msg = "Greetings, {{contact_name}}. Please submit the birth"
                + " report for {{serial_number}}.";
            addMessage(
                _.extend({
                    group: data.group,
                    type: 'outcome_request',
                    message: msg
                }, data)
            );
        });

        // sort by due date
        doc.scheduled_tasks = _.sortBy(doc.scheduled_tasks, 'due');

    }
};
