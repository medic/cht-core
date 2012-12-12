var _ = require('underscore'),
    moment = require('moment'),
    transition = require('../../transitions/ohw_notifications'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    date = require('../../date'),
    registration,
    _getOHWRegistration;

exports.setUp = function(callback) {
    var now = moment();

    transition.db = fakedb;
    _getOHWRegistration = utils.getOHWRegistration;
    utils.getOHWRegistration = function(id, callback) {
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
exports.tearDown = function(callback) {
    utils.getOHWRegistration = _getOHWRegistration;
    callback();
}

exports['mutes messages'] = function(test) {
    var doc = {
        patient_id: 'abc',
        notifications: false
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('turned off') >= 0);
        test.equals(registration.muted, true);
        test.equals(registration.scheduled_tasks.length, 3);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'muted';
        }));
        test.done();
    });
};

exports['unmutes messages; discards old ones'] = function(test) {
    var doc = {
        patient_id: 'muteme',
        notifications: true
    };

    _.each(registration.scheduled_tasks, function(task) {
        task.state = 'muted';
    });
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('turned on') >= 0);
        test.equals(registration.muted, false);
        test.equals(registration.scheduled_tasks.length, 2);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'scheduled' && moment(task.due) >= moment();
        }));
        test.done();
    });
};
