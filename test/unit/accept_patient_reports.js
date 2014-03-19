var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/accept_patient_reports'),
    utils = require('../../lib/utils');

exports.tearDown = function(callback) {
    if (transition.getAcceptedReports.restore)
        transition.getAcceptedReports.restore();

    if (transition.silenceReminders.restore)
        transition.silenceReminders.restore();

    if (transition.matchRegistrations.restore)
        transition.matchRegistrations.restore();

    if (utils.getRegistrations.restore)
        utils.getRegistrations.restore();

    callback();
}

exports['signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);

    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
}

exports['filter validation'] = function(test) {
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        form: 'x',
        related_entities: {
            clinic: {}
        }
    }), false);
    test.done();
}

exports['onMatch returns false if form not included'] = function(test) {
    sinon.stub(transition, 'getAcceptedReports').returns([ { form: 'x' }, { form: 'z' } ]);

    transition.onMatch({
        doc: {
            form: 'y'
        }
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, false);
        test.done();
    });
}

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
        patient_id: 'x',
        from: "+123",
        related_entities: {
            clinic: {
                contact: {
                    phone: '+1234',
                    name: 'woot'
                }
            }
        }
    };

    transition.matchRegistrations({
        registrations: [],
        doc: doc,
        report: {
            messages: [{
                event_type: 'registration_not_found',
                message: 'not found {{patient_id}}',
                recipient: 'reporting_unit'
            }]
        }
    }, function(err, complete) {
        test.ok(doc.errors);
        test.equals(doc.errors[0].message, 'not found x');
        test.ok(doc.tasks);
        test.equals(
            _.first(_.first(doc.tasks).messages).message,
            'not found x'
        );
        test.done();
    });
}

exports['matchRegistrations with registrations adds reply'] = function(test) {
    var doc;

    doc = {
        patient_id: 'x',
        related_entities: {
            clinic: {
                contact: {
                    phone: '+1234',
                    name: 'woot'
                }
            }
        }
    };

    transition.matchRegistrations({
        registrations: [{}],
        doc: doc,
        report: {
            messages: [{
                event_type: 'report_accepted',
                message: 'Thank you, {{contact.name}}. ANC visit for {{patient_id}} has been recorded.',
                recipient: 'reporting_unit'
            }]
        }
    }, function(err, complete) {
        test.ok(doc.tasks);
        test.equals(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, woot. ANC visit for x has been recorded.'
        );
        test.done();
    });
}


exports['adding silence_type to matchRegistrations calls silenceReminders'] = function(test) {
    sinon.stub(transition, 'silenceReminders').callsArgWithAsync(1, null);

    transition.matchRegistrations({
        doc: {},
        registrations: [ {}, {}, {}],
        report: {
            silence_type: 'x'
        }
    }, function(err, complete) {
        test.equals(complete, true);
        test.equals(transition.silenceReminders.callCount, 3);

        test.done();
    });
};

exports['silenceReminders testing'] = function(test) {
    var db,
        now = moment(),
        registration;

    db = { saveDoc: function() {} };

    sinon.stub(db, 'saveDoc').callsArgWithAsync(1, null);

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
        db: db,
        registration: registration,
        type: 'x',
        reported_date: now.clone().toISOString(),
        silence_for: '19 days'
    }, function(err) {
        var tasks;

        test.equals(err, null);

        test.equals(db.saveDoc.called, true);

        tasks = registration.doc.scheduled_tasks;

        test.equals(tasks[0].state, 'scheduled');
        test.equals(tasks[1].state, 'cleared');
        test.equals(tasks[1].state_history[0].state, 'cleared');
        test.equals(tasks[2].state, 'scheduled');
        test.equals(tasks[3].state, 'scheduled');
        test.equals(tasks[4].state, 'cleared');
        test.equals(tasks[4].state_history[0].state, 'cleared');

        test.done();
    });
};

exports['is not repeatable'] = function(test) {
    test.equals(Boolean(transition.repeatable), false);
    test.done();
};
