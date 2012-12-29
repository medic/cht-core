var _ = require('underscore'),
    transition = require('../../transitions/ohw_counseling'),
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
                patient_id: "123",
                serial_number: "ABC",
                scheduled_tasks: [
                    {
                        messages: [ { message: 'x' } ],
                        type: 'counseling_reminder'
                    },
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

exports['invalid patient response'] = function(test) {
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
        test.same(message, "No patient with id 'fake' found.")
        // no message to health facility if advice was received
        test.equal(doc.tasks.length, 1);
        test.done();
    });
};

exports['removes counseling_reminder task from registration'] = function(test) {
    var doc = {
        patient_id: 'ABC',
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
        test.ok(!doc.tasks);
        test.equals(utils.filterScheduledMessages(registration, 'counseling_reminder').length, 0);

        // doesn't touch upcoming delivery
        test.equals(utils.filterScheduledMessages(registration, 'upcoming_delivery').length, 1);
        test.done();
    });
}


