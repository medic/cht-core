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
        test.same(message, "Thank you, qq. Birth outcome report for ABC has been recorded.");

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
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded. The"
            + " Baby is LBW. Please refer the baby to the health post immediately."
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
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded. The"
            + " Baby is LBW. Please refer the baby to the health post immediately."
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
        test.ok(registration);
        test.equals(registration.scheduled_tasks.length, 0);

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
        test.ok(registration);
        test.equals(registration.scheduled_tasks.length, 0);

        test.done();
    });
};

exports['clear schedule for deceased mother, low weight (red) child'] = function(test) {
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
        test.ok(registration);
        test.equals(registration.scheduled_tasks.length, 0);

        test.done();
    });
};

exports['response for deceased mother and sick but normal weight child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Green',
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
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " If danger sign, please call health worker immediately and fill"
            + " in the emergency report."
        )

        test.done();
    });
};

exports['response for deceased mother and sick and low weight (yellow) child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Yellow',
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
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately."
        )

        test.done();
    });
};

exports['response for deceased mother and sick and low weight (red) child'] = function(test) {
    test.expect(3);
    var doc = {
        outcome_mother: 'Deceased',
        outcome_child: 'Alive and Sick',
        birth_weight: 'Red',
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
        test.same(
            message,
            "Thank you, qq. Birth outcome report for ABC has been recorded."
            + " The Baby is LBW. Please refer the baby to the health post"
            + " immediately."
        )

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
        test.same(message, "Thank you, qq. Birth outcome report for ABC has been recorded.");

        test.done();
    });
};

exports['response for deceased mother low weight child'] = function(test) {
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
        var message_exp = "Thank you, qq. Birth outcome report for ABC has been"
            + " recorded. The Baby is LBW. Please refer the baby to the health"
            + " post immediately.";

        test.ok(complete);

        test.equal(doc.tasks.length, 1);
        message = _.first(_.first(doc.tasks).messages).message;

        test.same(message, message_exp);

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

exports['updates registration with weight, birth date'] = function(test) {
    var doc = {
        outcome_mother: 'Alive and Well',
        outcome_child: 'Alive and Well',
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

        test.equal(registration.child_outcome, 'Alive and Well');
        test.equal(registration.child_birth_weight, 'Green');
        test.equal(registration.child_birth_date, today.startOf('day').subtract('days', 1).valueOf());

        test.done();
    });
};

exports['sets two pnc reminders with normal weight'] = function(test) {
    var doc = {
        outcome_child: 'Alive and Well',
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
        outcome_child: 'Alive and Well',
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


