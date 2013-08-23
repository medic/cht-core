var _ = require('underscore'),
    gently = global.GENTLY = new (require('gently')),
    moment = require('moment'),
    transition = require('../../transitions/ohw_notifications'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    date = require('../../date'),
    registration;

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;

    var now = moment();

    gently.hijacked['../lib/utils'].getOHWRegistration = function(id, callback) {
        var state = id === 'muteme' ? 'muted' : 'scheduled';

        registration = {
            scheduled_tasks: [
                {
                    messages: [ { message: 'keep me' } ],
                    type: 'anc_visit',
                    state: state,
                    due: now.clone().add('days', 22).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    state: state,
                    due: now.clone().add('days', 20).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    state: state,
                    due: now.clone().subtract('days', 3).valueOf()
                }
            ]
        };

        callback(null, registration);
    };
    callback();
};

exports['mutes messages'] = function(test) {
    test.expect(4);
    var doc = {
        patient_id: 'abc',
        serial_number: '123',
        notifications: 'off'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('deactivated') >= 0);
        test.equals(doc.notifications, 'off');
        test.equals(registration.scheduled_tasks.length, 3);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'muted';
        }));
        test.done();
    });
};

exports['unmutes messages; discards old ones'] = function(test) {
    test.expect(4);
    var doc = {
        patient_id: 'muteme',
        notifications: 'on'
    };

    _.each(registration.scheduled_tasks, function(task) {
        task.state = 'muted';
    });

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('reactivated') >= 0);
        test.equals(doc.notifications, 'on');
        test.equals(registration.scheduled_tasks.length, 2);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'scheduled' && moment(task.due) >= moment();
        }));
        test.done();
    });
};
