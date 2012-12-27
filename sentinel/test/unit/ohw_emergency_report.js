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
                patient_id: "123",
                serial_number: "abc",
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

exports['invalid patient response'] = function(test) {
    test.expect(4);
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

exports['ANC danger sign with advice response'] = function(test) {
    test.expect(4);
    var doc = {
        patient_id: '123',
        anc_labor_pnc: 'ANC',
        labor_danger: 'yes',
        advice_received: 'yes',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
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
        var task = _.first(doc.tasks),
            message = (_.first(task.messages) || {}).message;
        test.ok(complete);
        test.ok(registration);
        test.same(message, "Thank you, Clinic 2. Danger sign for abc has been recorded.");
        // no message to health facility if advice was received
        test.equal(doc.tasks.length, 1);
        test.done();
    });
};

exports['ANC danger sign and no advice response'] = function(test) {
    test.expect(9);
    var doc = {
        patient_id: '123',
        anc_labor_pnc: 'ANC',
        labor_danger: 'yes',
        advice_received: 'no',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    var msg1 = "Thank you, Clinic 2. Danger sign for abc has been recorded.";

    var msg2 = "Clinic 2 has reported a danger sign for 123. Please follow up "
        + "with her and provide necessary assistance immediately.";

    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(complete);
        test.equal(doc.tasks.length, 2);
        // check clinic response
        test.same(doc.tasks[0].messages[0].message, msg1);
        test.same(doc.tasks[0].messages[0].to, 'clinic');
        test.same(doc.tasks[0].state, 'pending');
        // check health facility response
        test.same(doc.tasks[1].messages[0].message, msg2);
        test.same(doc.tasks[1].messages[0].to, 'parent');
        test.same(doc.tasks[1].state, 'pending');
        test.ok(registration);
        test.done();
    });
};

exports['ANC no danger and no advice sign'] = function(test) {
    test.expect(6);
    var doc = {
        patient_id: '123',
        anc_labor_pnc: 'ANC',
        labor_danger: 'no',
        advice_received: 'no',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    var msg1 = "Thank you, Clinic 2. No danger sign for abc has been recorded.";

    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(complete);
        test.ok(registration);
        test.equal(doc.tasks.length, 1);
        // check clinic response
        test.same(doc.tasks[0].messages[0].message, msg1);
        test.same(doc.tasks[0].messages[0].to, 'clinic');
        test.same(doc.tasks[0].state, 'pending');
        test.done();
    });
};
