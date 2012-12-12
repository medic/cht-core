var _ = require('underscore'),
    moment = require('moment'),
    transition = require('../../transitions/ohw_birth_report'),
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
        message = _.first(task.messages).message;
        test.ok(message.indexOf('fake') > 0);

        test.done();
    });
};

exports['responds to low weight report with advice'] = function(test) {
    var doc = {
        outcome_child: 'Alive and well',
        birth_weight: 'Red',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('Thank you, qq.') >= 0);
        test.ok(message.indexOf('low birth weight') >= 0);

        test.done();
    });
};

exports['responds to normal weight report with thanks'] = function(test) {
    var doc = {
        outcome_child: 'Alive and well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.equals(message, 'Thank you, qq. Birth report has been recorded.');

        test.done();
    });
};

exports['updates registration with weight, birth date'] = function(test) {
    var doc = {
        outcome_child: 'Alive and well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                name: 'qq',
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
        var today = moment();

        test.ok(complete);

        test.equal(registration.child_outcome, 'Alive and well');
        test.equal(registration.child_birth_weight, 'Green');
        test.equal(registration.child_birth_date, today.startOf('day').subtract('days', 1).valueOf());

        test.done();
    });
};

exports['sets two pnc reminders with normal weight'] = function(test) {
    var doc = {
        outcome_child: 'Alive and well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                name: 'qq',
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
        var reminders = utils.filterScheduledMessages(registration, 'pnc_visit');

        test.equals(reminders.length, 2);

        test.done();
    });
};

exports['sets four pnc reminders with yellow weight'] = function(test) {
    var doc = {
        outcome_child: 'Alive and well',
        birth_weight: 'Yellow',
        days_since_delivery: 3,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                },
                name: 'qq',
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
        var reminders = utils.filterScheduledMessages(registration, 'pnc_visit');

        test.equals(reminders.length, 4);

        test.done();
    });
};


