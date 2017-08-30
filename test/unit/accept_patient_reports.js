var _ = require('underscore'),
    config = require('../../config'),
    moment = require('moment'),
    sinon = require('sinon').sandbox.create(),
    transition = require('../../transitions/accept_patient_reports'),
    utils = require('../../lib/utils');

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['filter validation'] = function(test) {
    test.equal(transition.filter({}), false);
    test.equal(transition.filter({
        form: 'x'
    }), false);
    test.done();
};

exports['onMatch callback empty if form not included'] = function(test) {
    sinon.stub(config, 'get').returns([ { form: 'x' }, { form: 'z' } ]);

    transition.onMatch({
        doc: {
            form: 'y'
        }
    }, {}, {}, function(err, changed) {
        test.equal(err, undefined);
        test.equal(changed, undefined);
        test.done();
    });
};

exports['onMatch with matching form calls getRegistrations and then getPatientContact and then getLocale'] = function(test) {
    sinon.stub(config, 'get').returns([ { form: 'x', messages: [] }, { form: 'z' } ]);

    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []),
        getPatientContact = sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, { _id: 'uuid', name: 'sally' });

    const getLocale = sinon.stub(utils, 'getLocale').returns('en');

    transition.onMatch({
        doc: {
            form: 'x',
            fields: { patient_id: 'x' }
        }
    }, {}, {}, function(err, complete) {
        test.equal(complete, true);

        test.equal(getRegistrations.called, true);
        test.equal(getPatientContact.called, true);
        test.equal(getPatientContact.callCount, 1);
        test.equal(getPatientContact.args[0][1], 'x');
        test.equal(getLocale.called, true);

        test.done();
    });
};

exports['onMatch with no patient id adds error msg and response'] = function(test) {
    sinon.stub(config, 'get').returns([ { form: 'x' }, { form: 'z' } ]);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContact').callsArgWith(2);

    var doc = {
        form: 'x',
        fields: { patient_id: 'x' }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function() {
        test.ok(doc.errors, 'There should be an error');
        test.equal(doc.errors.length, 1);
        test.equal(doc.errors[0].message, 'messages.generic.registration_not_found');
        test.done();
    });
};

// Because patients can be created through the UI and not neccessarily have
// a registration at all
exports['handleReport with no registrations does not error'] = function(test) {
    var doc = {
        fields: { patient_id: 'x' },
        from: '+123'
    };
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, {});

    const config = {
        messages: [{
            event_type: 'registration_not_found',
            message: [{
                content: 'not found {{patient_id}}',
                locale: 'en'
            }],
            recipient: 'reporting_unit'
        }]
    };

    transition.handleReport(
        null,
        null,
        doc,
        null,
        config,
        function() {
            test.ok(!doc.errors);
            test.ok(!doc.tasks);
            test.done();
        });
};

exports['handleReport with patient adds reply'] = function(test) {
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
    const patient = { patient_name: 'Archibald' };
    sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, patient);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    const config = {
        messages: [{
            event_type: 'report_accepted',
            message: [{
                content: 'Thank you, {{contact.name}}. ANC visit for {{patient_name}} ({{patient_id}}) has been recorded.',
                locale: 'en'
            }],
            recipient: 'reporting_unit'
        }]
    };
    transition.handleReport(
        null,
        null,
        doc,
        patient,
        config,
        function() {
            test.ok(doc.tasks);
            test.equal(
                _.first(_.first(doc.tasks).messages).message,
                'Thank you, woot. ANC visit for Archibald (559) has been recorded.'
            );
            test.done();
        });
};

exports['adding silence_type to handleReport calls _silenceReminders'] = function(test) {
    sinon.stub(transition, '_silenceReminders').callsArgWith(4);
    const doc = { _id: 'a' };
    const config = { silence_type: 'x' };
    const registrations = [
        { id: 'a' }, // should not be silenced as it's the doc being processed
        { id: 'b' }, // should be silenced
        { id: 'c' }  // should be silenced
    ];
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, registrations);
    sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, {});
    transition.handleReport(
        null,
        null,
        doc,
        null,
        config,
        function(err, complete) {
            test.equals(complete, true);
            test.equals(transition._silenceReminders.callCount, 2);
            test.equals(transition._silenceReminders.args[0][1].id, 'b');
            test.equals(transition._silenceReminders.args[1][1].id, 'c');
            test.done();
        });
};

exports['_silenceReminders testing'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment(),
        registration;

    sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

    // mock up a registered_patients view result
    registration = {
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
    };
    const config = { silence_type: 'x', silence_for: '15 days'};
    const reported_date = now.valueOf();

    transition._silenceReminders(
        audit, registration, reported_date, config,
        function(err) {
            var tasks;

            test.equal(err, null);

            test.equal(audit.saveDoc.called, true);

            tasks = registration.scheduled_tasks;

            test.equal(tasks[0].state, 'scheduled');
            test.equal(tasks[1].state, 'scheduled');
            test.equal(tasks[2].state, 'cleared');
            test.equal(tasks[2].state_history[0].state, 'cleared');
            test.equal(tasks[3].state, 'cleared');
            test.equal(tasks[3].state_history[0].state, 'cleared');
            test.equal(tasks[4].state, 'scheduled');
            test.equal(tasks[5].state, 'scheduled');
            test.equal(tasks[6].state, 'scheduled');

            test.done();
        });
};

exports['empty silence_for option clears all reminders'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment();

    sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

    // mock up a registered_patients view result
    const registration = {
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
    };
    const reported_date = now.clone().toISOString();
    const config = { silence_type: 'x', silence_for: '' };
    transition._silenceReminders(
        audit, registration, reported_date, config,
        function(err) {
            var tasks;

            test.equal(err, null);

            test.equal(audit.saveDoc.called, true);

            tasks = registration.scheduled_tasks;

            // don't clear in the past
            test.equal(tasks[0].state, 'scheduled');

            // only clear schedule of the same type
            test.equal(tasks[2].state, 'scheduled');

            test.equal(tasks[1].state, 'cleared');
            test.equal(tasks[1].state_history[0].state, 'cleared');
            test.equal(tasks[3].state, 'cleared');
            test.equal(tasks[4].state, 'cleared');
            test.equal(tasks[4].state_history[0].state, 'cleared');

            test.done();
    });
};

exports['when silence_type is comma separated act on multiple schedules'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment();

    sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

    // mock up a registered_patients view result
    const registration = {
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
                due: now.clone().subtract(2, 'days').toISOString(),
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
    };

    const config = { silence_type: 'foo, bar', silence_for: '' };
    const reported_date = now.clone().toISOString();
    transition._silenceReminders(
        audit, registration, reported_date, config,
        function(err) {
            test.equal(err, null);

            test.equal(audit.saveDoc.called, true);

            const tasks = registration.scheduled_tasks;

            // don't clear in the past
            test.equal(tasks[0].state, 'scheduled');

            test.equal(tasks[1].state, 'cleared');
            test.equal(tasks[1].state_history[0].state, 'cleared');
            test.equal(tasks[2].state, 'cleared');
            test.equal(tasks[2].state_history[0].state, 'cleared');
            // don't clear in the past
            test.equal(tasks[3].state, 'scheduled');
            test.equal(tasks[4].state, 'cleared');
            test.equal(tasks[4].state_history[0].state, 'cleared');

            test.done();
        });
};

exports['when silence_type is comma separated act on multiple schedules - with silence_for'] = function(test) {
    var audit = { saveDoc: function() {} },
        now = moment();

    sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

    // mock up a registered_patients view result
    const registration = {
        scheduled_tasks: [
            // in the past : not cleared
            {
                due: now.clone().subtract(2, 'days').toISOString(),
                group: 0,
                state: 'scheduled',
                type: 'foo'
            },
            // in time window: cleared
            {
                due: now.clone().add(2, 'days').toISOString(),
                group: 0,
                state: 'scheduled',
                type: 'foo'
            },
            // other schedule, in the past : not cleared
            {
                due: now.clone().subtract(2, 'days').toISOString(),
                group: 0,
                state: 'scheduled',
                type: 'bar'
            },
            // other schedule, within time window : cleared
            {
                due: now.clone().add(2, 'days').toISOString(),
                group: 1,
                state: 'scheduled',
                type: 'bar'
            },
            // yet other schedule, outside time window : not cleared
            {
                due: now.clone().add(200, 'days').toISOString(),
                group: 1,
                state: 'scheduled',
                type: 'baz'
            }
        ]
    };
    const reported_date = now.clone().toISOString();
    const config = { silence_type: 'foo, bar', silence_for: '15 days' };
    transition._silenceReminders(
        audit, registration, reported_date, config,
        function(err) {
            test.equal(err, null);

            test.equal(audit.saveDoc.called, true);

            const tasks = registration.scheduled_tasks;

            // in the past : not cleared
            test.equal(tasks[0].state, 'scheduled');
            // in time window: cleared
            test.equal(tasks[1].state, 'cleared');
            test.equal(tasks[1].state_history[0].state, 'cleared');

            // other schedule, in the past : not cleared
            test.equal(tasks[2].state, 'scheduled');
            // other schedule, within time window : cleared
            test.equal(tasks[3].state, 'cleared');
            test.equal(tasks[3].state_history[0].state, 'cleared');

            // yet other schedule, outside time window : not cleared
            test.equal(tasks[4].state, 'scheduled');

            test.done();
        });
};
