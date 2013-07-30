var _ = require('underscore'),
    gently = global.GENTLY = new (require('gently')),
    transition = require('../../transitions/ohw_emergency_report'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    registration;

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    gently.hijacked['../lib/utils'].getOHWRegistration = function(id, callback) {
        if (id === 'fake') {
            registration = false;
        } else {
            registration = {
                patient_id: "123",
                serial_number: "ABC",
                scheduled_tasks: [
                    {
                        messages: [ { message: 'x' } ],
                        type: 'upcoming_delivery'
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
    }, fakedb, function(err, complete) {
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
        labor_danger: 'Yes',
        advice_received: 'Yes',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
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
    }, fakedb, function(err, complete) {
        var task = _.first(doc.tasks),
            message = (_.first(task.messages) || {}).message;
        test.ok(complete);
        test.ok(registration);
        test.same(message, "Thank you, Paul. Danger sign for ABC has been recorded.");
        // no message to health facility if advice was received
        test.equal(doc.tasks.length, 1);
        test.done();
    });
};

exports['ANC danger sign and no advice response'] = function(test) {
    var doc,
        msg1,
        msg2;

    test.expect(9);
    doc = {
        patient_id: '123',
        anc_labor_pnc: 'ANC',
        labor_danger: 'Yes',
        advice_received: 'No',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    msg1 = "Thank you, Paul. Danger sign for ABC has been recorded.";

    msg2 = "Paul has reported a danger sign for 123. Please follow up " +
        "with her and provide necessary assistance immediately.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
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

exports['PNC danger sign and no advice response'] = function(test) {
    test.expect(9);
    var doc = {
        patient_id: '123',
        anc_labor_pnc: 'PNC',
        labor_danger: 'Yes',
        advice_received: 'No',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    var msg1 = "Thank you, Paul. Danger sign for ABC has been recorded.";

    var msg2 = "Paul has reported a danger sign for 123. Please follow up "
        + "with her and provide necessary assistance immediately.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
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
    var doc,
        msg1;

    test.expect(6);
    doc = {
        patient_id: '123',
        anc_labor_pnc: 'ANC',
        labor_danger: 'No',
        advice_received: 'No',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    msg1 = "Thank you, Paul. No danger sign for ABC has been recorded.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
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

exports['Labor with no danger sign or advice response'] = function(test) {
    var doc,
        msg1,
        msg2;

    test.expect(9);
    doc = {
        patient_id: '123',
        anc_labor_pnc: 'In labor',
        labor_danger: 'No',
        advice_received: 'No',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    msg1 = "Thank you Paul. Labor report for ABC has been recorded. Please submit the birth outcome report after delivery.";

    msg2 = "Paul has reported a labor. Please follow up with her and provide necessary assistance immediately.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
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

exports['Labor with danger sign and no advice response'] = function(test) {
    var doc,
        msg1,
        msg2;

    test.expect(9);
    doc = {
        patient_id: '123',
        anc_labor_pnc: 'In labor',
        labor_danger: 'Yes',
        advice_received: 'No',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    msg1 = "Thank you Paul. Labor report and danger sign for ABC has been recorded. Please submit the birth outcome report after delivery.";

    msg2 = "Paul has reported a danger sign during labor. Please follow up with her and provide necessary assistance immediately.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
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

exports['Labor with danger sign and advice response'] = function(test) {
    var doc,
        msg1;

    test.expect(6);
    doc = {
        patient_id: '123',
        anc_labor_pnc: 'In labor',
        labor_danger: 'Yes',
        advice_received: 'Yes',
        related_entities: {
            clinic: {
                name: 'Clinic 2',
                contact: {
                    phone: 'clinic',
                    name: 'Paul'
                },
                parent: {
                    contact: {
                        phone: 'parent'
                    }
                }
            }
        }
    };

    msg1 = "Thank you Paul. Labor report and danger sign for ABC has been recorded. Please submit the birth outcome report after delivery.";

    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(complete);
        test.equal(doc.tasks.length, 1);
        // check clinic response
        test.same(doc.tasks[0].messages[0].message, msg1);
        test.same(doc.tasks[0].messages[0].to, 'clinic');
        test.same(doc.tasks[0].state, 'pending');
        test.ok(registration);
        test.done();
    });
};
