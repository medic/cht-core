var _ = require('underscore'),
    gently = global.GENTLY = new (require('gently')),
    moment = require('moment'),
    transition = require('../../transitions/ohw_registration'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    date = require('../../date');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    gently.hijacked['../lib/utils'].checkOHWDuplicates = fakedb.checkOHWDuplicates;
    gently.hijacked['../lib/utils'].getOHWRegistration = function(id, callback) {
        callback(null, null); // always report no registration collision
    };
    callback();
};

exports['sets id'] = function(test) {
    var doc = {
        serial_number: 'abc',
        last_menstrual_period: 0
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(doc.patient_id);

        test.done();
    });
};

exports['sets dates'] = function(test) {
    var doc = {
        serial_number: 'abc',
        last_menstrual_period: 1
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        var expectedLmp = moment(date.getDate()).startOf('day').startOf('week').subtract('weeks', 1),
            expectedDate = expectedLmp.clone().add('weeks', 40);

        test.ok(doc.lmp_date);
        test.equals(doc.lmp_date, expectedLmp.valueOf());
        test.ok(doc.expected_date);
        test.equals(doc.expected_date, expectedDate.valueOf());

        test.done();
    });
}

exports['adds acknowledgement'] = function(test) {
    var doc = {
        serial_number: 'abc',
        last_menstrual_period: 1
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(doc.tasks);
        test.ok(doc.tasks.length);
        test.done();
    });
}

exports['adds scheduled messages'] = function(test) {
    test.expect(9);
    var doc = {
        serial_number: 'abc',
        last_menstrual_period: 1,
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(doc.scheduled_tasks);
        test.equals(utils.filterScheduledMessages(doc, 'anc_visit').length, 11);
        test.equals(utils.filterScheduledMessages(doc, 'miso_reminder').length, 1);
        test.equals(utils.filterScheduledMessages(doc, 'upcoming_delivery').length, 2);
        test.equals(utils.filterScheduledMessages(doc, 'outcome_request').length, 1);
        test.equals(utils.filterScheduledMessages(doc, 'counseling_reminder').length, 0);
        test.equals(utils.filterScheduledMessages(doc, 'counseling_reminder_lbw').length, 0);
        test.equals(utils.filterScheduledMessages(doc, 'blargle margle').length, 0);
        // all scheduled messages have patient_id
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            var message = _.first(task.messages).message;
            return message.indexOf(doc.serial_number) >= 0 && message.indexOf('qq') >= 0;
        }));
        test.done();
    });
}

exports['response for positive registration with LMP of 6'] = function(test) {
    test.expect(3);
    var doc = {
        serial_number: 'abc',
        last_menstrual_period: 6,
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(complete);
        test.equal(doc.tasks.length, 1);
        var patient_id = doc.patient_id,
            message = _.first(_.first(doc.tasks).messages).message,
            weeks = Math.round(moment.duration(moment(doc.lmp_date).add('days', 81).valueOf() - date.getTimestamp()).asWeeks());

        test.same(
            message,
            'Thank you qq for registering abc. Patient ID is '+ patient_id + '. ANC visit is needed in ' + weeks + ' weeks.'
        );

        test.done();
    });
}
