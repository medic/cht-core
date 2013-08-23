var _ = require('underscore'),
    gently = global.GENTLY = new (require('gently')),
    moment = require('moment'),
    i18n = require('../../i18n'),
    transition = require('../../transitions/ohw_birth_report'),
    db = gently.stub('DbStub', '../../db'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    registration;

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    gently.hijacked['../lib/utils'].getOHWRegistration = function(id, callback) {
        fakedb.getOHWRegistration(id, function(err, reg) {
            registration = reg;
            callback(err, reg);
        });
    };
    gently.hijacked['../lib/utils'].checkOHWDuplicates = fakedb.checkOHWDuplicates;
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
        outcome_child: 'Alive and Well',
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.equal(
            doc.tasks[0].messages[0].message,
            i18n(transition.messages.lbw_and_onot, {
                contact_name: 'qq',
                serial_number: 'ABC'
            })
        );

        test.done();
    });
};

exports['response for deceased mother and healthy but low weight (red) child'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        test.equal(
            doc.tasks[0].messages[0].message,
            i18n(transition.messages.lbw_and_onot, {
                contact_name: 'qq',
                serial_number: 'ABC'
            })
        );

        test.done();
    });
};

exports['no pnc schedule for deceased mother, normal outcome child'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);
        test.ok(registration);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['no pnc schedule for deceased mother, low weight (yellow) child'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);
        test.ok(registration);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['no pnc schedule for deceased mother, low weight (red) child'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);
        test.ok(registration);
        // queued response for chw/fchv
        test.equal(doc.tasks.length, 1);
        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['response/no pnc schedule for deceased mother and sick but normal weight child'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['response/no pnc schedule for deceased mother and sick and low weight (yellow) child'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['response/cleared task for deceased mother and sick and low weight (red) child'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};


exports['response for normal outcome but no weight reported'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;
        test.same(
            message,
            i18n(transition.messages.normal_with_proto, {
                contact_name: 'qq',
                serial_number: 'ABC'
            })
        );

        test.done();
    });
};

exports['response for sick baby'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
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
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.done();
    });
};

exports['response/no schedule for deceased mother and no other fields'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " Please submit the Start/Stop Notifications form.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.type !== 'counselor_reminder';
        }));
        test.same(message, message_exp);

        test.done();
    });
};

exports['response/no schedule for deceased mother and no other fields'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var message;
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " Please complete necessary protocol.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

        test.ok(_.all(doc.scheduled_tasks, function(task) {
            return task.type !== 'counselor_reminder';
        }));

        test.done();
    });
};

exports['outcome report updates registration with weight, birth date'] = function(test) {
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var reported = moment(1380108400000);

        test.ok(complete);
        test.equal(registration.child_outcome, 'Alive and Well');
        test.equal(registration.child_birth_weight, 'Green');
        test.equal(
            registration.child_birth_date,
            reported.startOf('day').subtract('days', 1).valueOf()
        );

        test.done();
    });
};

exports['add schedule for outcome report with normal weight'] = function(test) {
    test.expect(2);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
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
    }, fakedb, function(err, complete) {
        var reminders = utils.filterScheduledMessages(registration, 'counseling_reminder');
        test.equal(reminders.length, 4);
        test.ok(_.all(reminders, function(task) {
            return task.state === 'scheduled';
        }));
        test.done();
    });
};

exports['add lbw schedule for low weight birth outcome'] = function(test) {
    test.expect(2);
    var doc = {
        reported_date: 1380108400000, // Sep 25 2013 06:26:40 GMT-0500
        outcome_child: 'Alive and Well',
        birth_weight: 'Yellow',
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
    }, fakedb, function(err, complete) {

        var reminders = utils.filterScheduledMessages(registration, 'counseling_reminder');

        test.equals(reminders.length, 6);
        test.ok(_.all(reminders, function(task) {
            return task.state === 'scheduled';
        }));

        test.done();
    });
};

// at time of this writing default value for ohw_birth_report_within_days is 45
exports['birth report fails proximity check sets up right messages'] = function(test) {
    test.expect(6);
    var doc = {
        reported_date: 1371208400000, // Jun 14 2013 06:13:20 GMT-0500
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
                    },
                    parent: {
                        contact: {
                            phone: 'grandparent'
                        }
                    }
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, function(err, complete) {
        test.ok(complete);
        test.equal(doc.tasks.length, 2);
        test.equal(
            doc.tasks[0].messages[0].message,
            i18n(transition.messages.edd_warn_facility, {
                contact_name: 'qq',
                patient_id: '123'
            })
        );
        test.equal(
            doc.tasks[1].messages[0].message,
            i18n(transition.messages.edd_warn, {
                contact_name: 'qq',
                serial_number: 'ABC'
            })
        );
        test.equal(
            doc.tasks[0].messages[0].to,
            'grandparent'
        );
        test.equal(
            doc.tasks[1].messages[0].to,
            'clinic'
        );
        test.done();
    });
};

exports['birth report fails proximity check not change schedule'] = function(test) {
    test.expect(2);
    var doc = {
        reported_date: 1371208400000, // Jun 14 2013 06:13:20 GMT-0500
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
    }, fakedb, function(err, complete) {
        test.equals(registration.scheduled_tasks.length, 3);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            return task.state === 'scheduled';
        }));
        test.done();
    });
};
