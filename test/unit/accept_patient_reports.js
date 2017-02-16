var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/accept_patient_reports'),
    utils = require('../../lib/utils');

exports.tearDown = function(callback) {
    if (transition.getAcceptedReports.restore) {
        transition.getAcceptedReports.restore();
    }
    if (transition.silenceReminders.restore) {
        transition.silenceReminders.restore();
    }
    if (transition.matchRegistrations.restore) {
        transition.matchRegistrations.restore();
    }
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    callback();
};

exports['function signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);

    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['filter validation'] = function(test) {
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        form: 'x'
    }), false);
    test.done();
};

exports['onMatch callback empty if form not included'] = function(test) {
    sinon.stub(transition, 'getAcceptedReports').returns([ { form: 'x' }, { form: 'z' } ]);

    transition.onMatch({
        doc: {
            form: 'y'
        }
    }, {}, {}, function(err, changed) {
        test.equals(err, undefined);
        test.equals(changed, undefined);
        test.done();
    });
};

exports['onMatch with matching form calls getRegistrations and then matchRegistrations'] = function(test) {

    var getRegistrations,
        matchRegistrations;

    sinon.stub(transition, 'getAcceptedReports').returns([ { form: 'x' }, { form: 'z' } ]);

    getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    matchRegistrations = sinon.stub(transition, 'matchRegistrations').callsArgWithAsync(1, null, true);

    transition.onMatch({
        doc: {
            form: 'x'
        }
    }, {}, {}, function(err, complete) {
        test.equals(complete, true);

        test.equals(getRegistrations.called, true);
        test.equals(matchRegistrations.called, true);

        test.done();
    });
};

exports['matchRegistrations with no registrations adds error msg and response'] = function(test) {

    var doc = {
        fields: { patient_id: 'x' },
        from: '+123'
    };

    transition.matchRegistrations({
        registrations: [],
        doc: doc,
        report: {
            messages: [{
                event_type: 'registration_not_found',
                message: [{
                    content: 'not found {{patient_id}}',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }]
        }
    }, function() {
        test.ok(doc.errors);
        test.equals(doc.errors[0].message, 'not found x');
        test.ok(doc.tasks);
        test.equals(
            _.first(_.first(doc.tasks).messages).message,
            'not found x'
        );
        test.done();
    });
};

exports['matchRegistrations with registrations adds reply'] = function(test) {
    var doc = {
        fields: { patient_id: '559' },
        contact: {
            phone: '+1234',
            name: 'woot',
            parent: {
                contact: {
                    phone: '+1234',
                    name: 'woot'
                }
            }
        }
    };

    transition.matchRegistrations({
        registrations: [{
            doc: { fields: { patient_name: 'Archibald' } }
        }],
        doc: doc,
        report: {
            messages: [{
                event_type: 'report_accepted',
                message: [{
                    content: 'Thank you, {{contact.name}}. ANC visit for {{patient_name}} ({{patient_id}}) has been recorded.',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }]
        }
    }, function() {
        test.ok(doc.tasks);
        test.equals(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, woot. ANC visit for Archibald (559) has been recorded.'
        );
        test.done();
    });
};


exports['adding silence_type to matchRegistrations calls silenceReminders'] = function(test) {
    sinon.stub(transition, 'silenceReminders').callsArgWithAsync(1, null);

    transition.matchRegistrations({
        doc: { _id: 'a' },
        registrations: [
            { _id: 'a' }, // should not be silenced as it's the doc being processed
            { _id: 'b' }, // should be silenced
            { _id: 'c' }  // should be silenced
        ],
        report: {
            silence_type: 'x'
        }
    }, function(err, complete) {
        test.equals(complete, true);
        test.equals(transition.silenceReminders.callCount, 2);
        test.equals(transition.silenceReminders.args[0][0].registration._id, 'b');
        test.equals(transition.silenceReminders.args[1][0].registration._id, 'c');
        test.done();
    });
};

exports['silenceReminders testing'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment(),
        registration;

    sinon.stub(audit, 'saveDoc').callsArgWithAsync(1, null);

    // mock up a registered_patients view result
    registration = {
        doc: {
            scheduled_tasks: [
                {
                    due: now.clone().subtract(5, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().subtract(2, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(10, 'days').toISOString(),
                    group: 2,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(12, 'days').toISOString(),
                    group: 2,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(12, 'days').toISOString(),
                    group: 2,
                    state: 'scheduled',
                    // a different type, should be ignored
                    type: 'y'
                },
                {
                    due: now.clone().add(20, 'days').toISOString(),
                    group: 3,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(25, 'days').toISOString(),
                    group: 3,
                    state: 'scheduled',
                    type: 'x'
                },
                // last one is out of order
                {
                    due: now.clone().add(7, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'x'
                }
            ]
        }
    };

    transition.silenceReminders({
        audit: audit,
        registration: registration,
        type: 'x',
        reported_date: now.valueOf(),
        silence_for: '15 days'
    }, function(err) {
        var tasks;

        test.equals(err, null);

        test.equals(audit.saveDoc.called, true);

        tasks = registration.doc.scheduled_tasks;

        test.equals(tasks[0].state, 'scheduled');
        test.equals(tasks[1].state, 'scheduled');
        test.equals(tasks[2].state, 'cleared');
        test.equals(tasks[2].state_history[0].state, 'cleared');
        test.equals(tasks[3].state, 'cleared');
        test.equals(tasks[3].state_history[0].state, 'cleared');
        test.equals(tasks[4].state, 'scheduled');
        test.equals(tasks[5].state, 'scheduled');
        test.equals(tasks[6].state, 'scheduled');

        test.done();
    });
};

exports['empty silence_for option clears all reminders'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment(),
        registration;

    sinon.stub(audit, 'saveDoc').callsArgWithAsync(1, null);

    // mock up a registered_patients view result
    registration = {
        doc: {
            scheduled_tasks: [
                {
                    due: now.clone().subtract(2, 'days'),
                    group: 0,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(2, 'days'),
                    group: 1,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(2, 'days'),
                    group: 2,
                    state: 'scheduled',
                    type: 'y'
                },
                {
                    due: now.clone().add(20, 'days'),
                    group: 2,
                    state: 'scheduled',
                    type: 'x'
                },
                {
                    due: now.clone().add(2, 'days'),
                    group: 1,
                    state: 'scheduled',
                    type: 'x'
                }
            ]
        }
    };

    transition.silenceReminders({
        audit: audit,
        registration: registration,
        type: 'x',
        reported_date: now.clone().toISOString(),
        silence_for: ''
    }, function(err) {
        var tasks;

        test.equals(err, null);

        test.equals(audit.saveDoc.called, true);

        tasks = registration.doc.scheduled_tasks;

        // don't clear in the past
        test.equals(tasks[0].state, 'scheduled');

        // only clear schedule of the same type
        test.equals(tasks[2].state, 'scheduled');

        test.equals(tasks[1].state, 'cleared');
        test.equals(tasks[1].state_history[0].state, 'cleared');
        test.equals(tasks[3].state, 'cleared');
        test.equals(tasks[4].state, 'cleared');
        test.equals(tasks[4].state_history[0].state, 'cleared');

        test.done();
    });
};

exports['when silence_type is comma separated act on multiple schedules'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment(),
        registration;

    sinon.stub(audit, 'saveDoc').callsArgWithAsync(1, null);

    // mock up a registered_patients view result
    registration = {
        doc: {
            scheduled_tasks: [
                {
                    due: now.clone().subtract(2, 'days').toISOString(),
                    group: 0,
                    state: 'scheduled',
                    type: 'foo'
                },
                {
                    due: now.clone().add(2, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'foo'
                },
                {
                    due: now.clone().add(2, 'days').toISOString(),
                    group: 2,
                    state: 'scheduled',
                    type: 'foo'
                },
                {
                    due: now.clone().add(2, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'bar'
                },
                {
                    due: now.clone().add(5, 'days').toISOString(),
                    group: 1,
                    state: 'scheduled',
                    type: 'bar'
                }
            ]
        }
    };

    transition.silenceReminders({
        audit: audit,
        registration: registration,
        type: 'foo, bar',
        reported_date: now.clone().toISOString(),
        silence_for: ''
    }, function(err) {
        var tasks;

        test.equals(err, null);

        test.equals(audit.saveDoc.called, true);

        tasks = registration.doc.scheduled_tasks;

        // don't clear in the past
        test.equals(tasks[0].state, 'scheduled');

        test.equals(tasks[1].state, 'cleared');
        test.equals(tasks[1].state_history[0].state, 'cleared');
        test.equals(tasks[2].state, 'cleared');
        test.equals(tasks[2].state_history[0].state, 'cleared');
        test.equals(tasks[3].state, 'cleared');
        test.equals(tasks[3].state_history[0].state, 'cleared');
        test.equals(tasks[4].state, 'cleared');
        test.equals(tasks[4].state_history[0].state, 'cleared');

        test.done();
    });
};
