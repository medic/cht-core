var _ = require('underscore'),
    sinon = require('sinon'),
    moment = require('moment'),
    transition = require('../../transitions/add_regimes');

exports['signature'] = function(test) {
    test.ok(_.isFunction(transition.addRegime));
    test.equals(transition.addRegime.length, 2);
    test.done();
};

exports['filter fails if no form'] = function(test) {
    test.equals(transition.filter({}), false);
    test.done();
};

exports['filter fails if only form there'] = function(test) {
    test.equals(transition.filter({
        form: 'x'
    }), false);
    test.done();
};

exports['filter fails if no clinic phone'] = function(test) {
    test.equals(transition.filter({
        form: 'x',
        patient_id: '123',
        related_entities: {
            clinic: {
                contact: {}
            }
        }
    }), false);
    test.done();
};

exports['filter passes if form, patient_id and clinic phone there'] = function(test) {
    test.equals(transition.filter({
        form: 'x',
        patient_id: '123',
        related_entities: {
            clinic: {
                contact: {
                    phone: '123'
                }
            }
        }
    }), true);
    test.done();
};

exports['filter fails if regime exists and matching scheduled_tasks'] = function(test) {
    test.equals(transition.filter({
        task_regimes: [ 'x' ],
        scheduled_tasks: [
            {
                type: 'x'
            }
        ]
    }), false);
    test.done();
};

exports['getOffset returns false for bad syntax'] = function(test) {
    test.equals(transition.getOffset('x'), false);
    test.equals(transition.getOffset('2 muppets'), false);
    test.equals(transition.getOffset('one week'), false);
    test.done();
};

exports['getOffset returns durations for good syntax'] = function(test) {
    test.equals(transition.getOffset('2 weeks').asDays(), 14);
    test.equals(transition.getOffset('81 days').asDays(), 81);
    test.done();
};

exports['addRegime returns false if already has scheduled_task for that type'] = function(test) {
    var added,
        doc;

    doc = {
        form: 'x',
        lmp_date: moment().valueOf(),
        scheduled_tasks: [
            {
                type: 'duckland'
            }
        ]
    };

    added = transition.addRegime(doc, {
        form: 'x',
        key: 'duckland',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: "This is for serial number {{serial_number}}."
            },
            {
                group: 4,
                offset: '81 days',
                message: "This is for serial number {{serial_number}}."
            }
        ],
        start_from: 'lmp_date'
    });

    test.equals(added, false);
    test.equals(doc.scheduled_tasks.length, 1);
    test.done();
}

exports['regime generates two scheduled messages'] = function(test) {
    var added,
        doc;
    doc = {
        form: 'x',
        serial_number: 'abc',
        lmp_date: moment().valueOf()
    };

    added = transition.addRegime(doc, {
        form: 'x',
        key: 'duckland',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: "This is for serial number {{serial_number}}."
            },
            {
                group: 4,
                offset: '81 days',
                message: "This is for serial number {{serial_number}}."
            }
        ],
        start_from: 'lmp_date'
    });

    test.equals(added, true);
    test.ok(doc.scheduled_tasks);
    test.equals(doc.scheduled_tasks.length, 2);
    test.equals(moment(doc.scheduled_tasks[1].due).diff(doc.lmp_date, 'days'), 81);

    test.done();
}

exports['regime does not generate scheduled messages in past'] = function(test) {
    var added,
        doc;

    doc = {
        form: 'x',
        serial_number: 'abc',
        lmp_date: moment().subtract(12, 'weeks').toISOString()
    };

    added = transition.addRegime(doc, {
        form: 'x',
        key: 'duckland',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: "This is for serial number {{serial_number}}."
            },
            {
                group: 4,
                offset: '20 weeks',
                message: "This is for serial number {{serial_number}}."
            }
        ],
        start_from: 'lmp_date'
    });

    test.equals(added, true);
    test.ok(doc.scheduled_tasks);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(moment(doc.scheduled_tasks[0].due).diff(doc.lmp_date, 'weeks'), 20);

    test.done();
}

exports['regime with registration_response creates message task'] = function(test) {
    var added,
        doc;
    doc = {
        form: 'x',
        serial_number: 'abc',
        lmp_date: moment().valueOf(),
        related_entities: {
            clinic: {
                contact: {
                    phone: '123'
                }
            }
        },
    };

    added = transition.addRegime(doc, {
        form: 'x',
        key: 'duckland',
        registration_response: 'Thanks for registering.',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: "This is for serial number {{serial_number}}."
            },
            {
                group: 4,
                offset: '81 days',
                message: "This is for serial number {{serial_number}}."
            }
        ],
        start_from: 'lmp_date'
    });

    test.equals(added, true);
    test.ok(doc.scheduled_tasks);
    test.equals(doc.tasks.length, 1);
    test.equals(doc.tasks[0].messages.length, 1);
    test.equals(doc.tasks[0].messages[0].to, '123');
    test.equals(doc.tasks[0].messages[0].message, 'Thanks for registering.');

    test.done();
}

exports['transition is repeatable'] = function(test) {
    test.equals(transition.repeatable, true);
    test.done();
}

exports['formMismatch'] = function(test) {
    test.ok(_.isFunction(transition.formMismatch));
    test.equals(transition.formMismatch.length, 2);

    test.equals(transition.formMismatch('x', { form: 'x' }), false);
    test.equals(transition.formMismatch('y', { form: 'x' }), true);
    test.done();
}

exports['alreadyRun validation'] = function(test) {
    test.equals(transition.alreadyRun({}, 'x'), false);
    test.equals(transition.alreadyRun({
        scheduled_tasks: [
            {
                type: 'y'
            }
        ]
    }, 'x'), false);
    test.equals(transition.alreadyRun({
        scheduled_tasks: [
            {
                type: 'x'
            }
        ]
    }, 'x'), true)
    test.equals(transition.alreadyRun({
        tasks: [
            {
                type: 'y'
            }
        ],
        scheduled_tasks: [
            {
                type: 'y'
            }
        ]
    }, 'x'), false);
    test.equals(transition.alreadyRun({
        tasks: [
            {
                type: 'x'
            }
        ],
        scheduled_tasks: [
            {
                type: 'y'
            }
        ]
    }, 'x'), true);
    test.done();
};
