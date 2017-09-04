var _ = require('underscore'),
    config = require('../../config'),
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
