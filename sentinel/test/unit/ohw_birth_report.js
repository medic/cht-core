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
                patient_id: "123",
                serial_number: "ABC",
                scheduled_tasks: [
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'upcoming_delivery',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'upcoming_delivery',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'outcome_request',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'counseling_reminder',
                        group: '1',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'counseling_reminder',
                        group: '1',
                        state: 'scheduled'
                    },
                    {
                        messages: [ { message: 'foo' } ],
                        type: 'counseling_reminder_lbw',
                        state: 'scheduled'
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

exports['response for invalid patient'] = function(test) {
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
        message = _.first(task.messages).message;
        test.same(message, "No patient with id 'fake' found.")
        // no message to health facility if advice was received
        test.equal(doc.tasks.length, 1);
        test.done();
    });
};

exports['response for normal weight and outcome'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, "Thank you, qq. Birth outcome report for ABC has been recorded.");

        test.done();
    });
};

exports['response for normal outcome but low weight (red)'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
        birth_weight: 'Red',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        var message_exp = "Thank you, qq. Birth outcome report for ABC has been"
            + " recorded. The Baby is LBW. Please refer the mother and baby to"
            + " the health post immediately.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);

        message = _.first(_.first(doc.tasks).messages).message;
        test.same(message, message_exp);

        test.done();
    });
};

exports['response for normal outcome but low weight (yellow)'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
        birth_weight: 'Yellow',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        var message_exp = "Thank you, qq. Birth outcome report for ABC has been"
            + " recorded. The Baby is LBW. Please refer the mother and baby to"
            + " the health post immediately.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(doc.tasks[0].messages[0].message, message_exp);

        test.done();
    });
};

exports['response for deceased mother and normal outcome child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " Please submit the Start/Stop Notifications form."
        );

        test.done();
    });
};

exports['response for deceased mother and healthy but low weight (yellow) child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        birth_weight: 'Yellow',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately. Please submit the Start/Stop Notifications form."
        )

        test.done();
    });
};

exports['response for deceased mother and healthy but low weight (red) child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Well',
        birth_weight: 'Red',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately. Please submit the Start/Stop Notifications form."
        )

        test.done();
    });
};

exports['clear schedule for deceased mother, normal outcome child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);
        test.ok(registration);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};

exports['clear schedule for deceased mother, low weight (yellow) child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Well',
        birth_weight: 'Yellow',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic',
                    name: 'qq'
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
        var message;

        test.ok(complete);
        test.ok(registration);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};

exports['clear schedule for deceased mother, low weight (red) child'] = function(test) {
    test.expect(4);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Well',
        birth_weight: 'Red',
        days_since_delivery: 1,
        patient_id: 'foo',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;

        test.ok(complete);
        test.ok(registration);
        // queued response for chw/fchv
        test.equal(doc.tasks.length, 1);
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};

exports['response/cleared schedule for deceased mother and sick but normal weight child'] = function(test) {
    test.expect(4);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Green',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " If danger sign, please call health worker immediately and fill"
            + " in the emergency report. Please submit the Start/Stop Notifications form."
        )
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};

exports['response and cleared tasks for deceased mother and sick and low weight (yellow) child'] = function(test) {
    test.expect(4);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Yellow',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately. Please submit the Start/Stop Notifications form."
        );
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};

exports['response/cleared task for deceased mother and sick and low weight (red) child'] = function(test) {
    test.expect(4);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Red',
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.same(
            doc.tasks[0].messages[0].message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately. Please submit the Start/Stop Notifications form."
        );
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.state === 'cleared';
        }));

        test.done();
    });
};


exports['response for normal outcome but no weight reported'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
        );

        test.done();
    });
};

exports['response for sick baby'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_child: 'Alive and Sick',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has"
            + " been recorded. If danger sign, please call health worker"
            + " immediately and fill in the emergency report.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.done();
    });
};

exports['response for deceased baby and no other fields'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_child: 'Deceased',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.done();
    });
};

exports['response for deceased mother and no other fields'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " Please submit the Start/Stop Notifications form.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.done();
    });
};

exports['response for deceased mother and no other fields'] = function(test) {
    test.expect(3);
    var doc = {
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " Please complete necessary protocol.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.done();
    });
};

exports['outcome report updates registration with weight, birth date'] = function(test) {
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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
        var today = moment();

        test.ok(complete);

        test.equal(registration.child_outcome, 'Alive and Well');
        test.equal(registration.child_birth_weight, 'Green');
        test.equal(registration.child_birth_date, today.startOf('day').subtract('days', 1).valueOf());

        test.done();
    });
};

exports['outcome report with normal weight removes lbw reminders'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_child: 'Alive and Well',
        birth_weight: 'Green',
        days_since_delivery: 1,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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

        test.equals(
            utils.filterScheduledMessages(registration, 'counseling_reminder')[0].state,
            'scheduled'
        );
        test.equals(
            utils.filterScheduledMessages(registration, 'counseling_reminder')[1].state,
            'scheduled'
        );
        test.equals(
            utils.filterScheduledMessages(registration, 'counseling_reminder_lbw')[0].state,
            'cleared'
        );
        test.done();
    });
};

exports['outcome with low weight has lbw reminders'] = function(test) {
    test.expect(1);
    var doc = {
        outcome_child: 'Alive and Well',
        birth_weight: 'Yellow',
        days_since_delivery: 3,
        patient_id: 'good',
        related_entities: {
            clinic: {
                contact: {
                    name: 'qq',
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

        test.equals(
            utils.filterScheduledMessages(registration, 'counseling_reminder_lbw')[0].state,
            'scheduled'
        );

        test.done();
    });
};


