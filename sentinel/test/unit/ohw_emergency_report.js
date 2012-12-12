var _ = require('underscore'),
    transition = require('../../transitions/ohw_emergency_report'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    registration,
    _getOHWRegistration;

exports.setUp = function(callback) {
    transition.db = fakedb;
    _getOHWRegistration = utils.getOHWRegistration;
    utils.getOHWRegistration = function(id, callback) {
        if (id === 'fake') {
            registration = false;
        } else {
            registration = {
                scheduled_tasks: [
                    {
                        messages: [ { message: 'x' } ],
                        type: 'upcoming_delivery'
                    }
                ]
            };
        }
        callback(null, registration);
    };
    callback();
};
exports.tearDown = function(callback) {
    utils.getOHWRegistration = _getOHWRegistration;
    callback();
};

exports['responds to invalid patient'] = function(test) {
    var doc = {
        patient_id: 'fake',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        var task = _.first(doc.tasks),
            message;

        test.ok(complete);

        test.ok(task);
        message = (_.first(task.messages) || {}).message;
        test.ok(message.indexOf('fake') > 0);

        test.done();
    });
};

exports['responds to valid patient'] = function(test) {
    var doc = {
        danger_sign: 'x',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(complete);

        test.equal(doc.tasks.length, 2);
        test.ok(_.contains(registration.danger_signs, 'x'));
        test.ok(registration);
        test.equal(registration.scheduled_tasks.length, 1);
        test.ok(_.first(registration.scheduled_tasks).messages[0].message !== 'x');

        test.done();
    });
};
