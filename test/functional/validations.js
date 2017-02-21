var sinon = require('sinon'),
    testUtils = require('../test_utils'),
    transition = require('../../transitions/accept_patient_reports');

/*
 * Eventually transitions/registration.js and accept_patient_reports.js will
 * be merged one transition, probably called form events.
 * */

exports.tearDown = function(callback) {
    testUtils.restore([transition.getAcceptedReports]);
    callback();
};

exports.setUp = function(callback) {
    // not required since these tests never pass pupil validations
    // sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    callback();
};

exports['patient id failing validation adds error'] = function(test) {
    test.expect(3);

    var doc = {
        patient_id: 'xxxx',
        form: 'x'
    };

    sinon.stub(transition, 'getAcceptedReports').returns([{
        validations: {
            list: [{
                property: 'patient_id',
                rule: 'regex("\\w{5}")',
                message: [{
                    content: 'bad id {{patient_id}}',
                    locale: 'en'
                }]
            }]
        },
        form: 'x'
    }]);

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(complete, true);
        test.ok(doc.errors);
        test.equals(doc.errors[0].message, 'bad id xxxx');
        test.done();
    });
};

exports['join responses concats validation response msgs'] = function(test) {
    test.expect(5);

    var doc = {
        from: '+123',
        patient_id: '123',
        fields: { patient_name: 'sam' },
        form: 'x'
    };

    sinon.stub(transition, 'getAcceptedReports').returns([{
        validations: {
            join_responses: true,
            list: [
                {
                    property: 'patient_id',
                    rule: 'regex("\\w{5}")',
                    message: [{
                        content: 'patient id should be 5 characters',
                        locale: 'en'
                    }]
                },
                {
                    property: 'patient_name',
                    rule: 'lenMin(5) && lenMax(50)',
                    message: [{
                        content: 'patient name should be between 5 and 50 chars.',
                        locale: 'en'
                    }]
                },
            ]
        },
        form: 'x'
    }]);

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(complete, true);
        test.ok(doc.errors);
        // check errors array
        test.equals(
            doc.errors[0].message,
            'patient id should be 5 characters'
        );
        test.equals(
            doc.errors[1].message,
            'patient name should be between 5 and 50 chars.'
        );
        // response should include all validation response messages
        test.equals(
            doc.tasks[0].messages[0].message,
            'patient id should be 5 characters  ' +
            'patient name should be between 5 and 50 chars.'
        );
        test.done();
    });
};

exports['false join_responses does not concat validation msgs'] = function(test) {
    test.expect(5);

    var doc = {
        from: '+123',
        patient_id: '123',
        fields: { patient_name: 'sam' },
        form: 'x'
    };

    sinon.stub(transition, 'getAcceptedReports').returns([{
        validations: {
            join_responses: false,
            list: [
                {
                    property: 'patient_id',
                    rule: 'regex("\\w{5}")',
                    message: [{
                        content: 'patient id should be 5 characters',
                        locale: 'en'
                    }]
                },
                {
                    property: 'patient_name',
                    rule: 'lenMin(5) && lenMax(50)',
                    message: [{
                        content: 'patient name should be between 5 and 50 chars.',
                        locale: 'en'
                    }]
                },
            ]
        },
        form: 'x'
    }]);

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(complete, true);
        test.ok(doc.errors);
        // check errors array
        test.equals(
            doc.errors[0].message,
            'patient id should be 5 characters'
        );
        test.equals(
            doc.errors[1].message,
            'patient name should be between 5 and 50 chars.'
        );
        // check response
        test.equals(
            doc.tasks[0].messages[0].message,
            'patient id should be 5 characters'
        );
        test.done();
    });
};

exports['undefined join_responses does not concat validation msgs'] = function(test) {
    test.expect(5);

    var doc = {
        from: '+123',
        patient_id: '123',
        fields: { patient_name: 'sam' },
        form: 'x'
    };

    sinon.stub(transition, 'getAcceptedReports').returns([{
        validations: {
            list: [
                {
                    property: 'patient_id',
                    rule: 'regex("\\w{5}")',
                    message: [{
                        content: 'patient id should be 5 characters',
                        locale: 'en'
                    }]
                },
                {
                    property: 'patient_name',
                    rule: 'lenMin(5) && lenMax(50)',
                    message: [{
                        content: 'patient name should be between 5 and 50 chars.',
                        locale: 'en'
                    }]
                },
            ]
        },
        form: 'x'
    }]);

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(complete, true);
        test.ok(doc.errors);
        // check errors array
        test.equals(
            doc.errors[0].message,
            'patient id should be 5 characters'
        );
        test.equals(
            doc.errors[1].message,
            'patient name should be between 5 and 50 chars.'
        );
        // check response
        test.equals(
            doc.tasks[0].messages[0].message,
            'patient id should be 5 characters'
        );
        test.done();
    });
};
