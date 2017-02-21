var transition = require('../../transitions/registration'),
    sinon = require('sinon'),
    moment = require('moment'),
    testUtils = require('../test_utils'),
    utils = require('../../lib/utils');

exports.setUp = function(callback) {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'BIR',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           },
           {
               name: 'on_create',
               trigger: 'add_birth_date',
               params: '',
               bool_expr: ''
           }
        ],
        validations: [
            {
                property: 'weeks_since_birth',
                rule: 'min(0) && max(52)',
                message: [{
                    content: 'Invalid DOB; must be between 0-52 weeks.',
                    locale: 'en'
                }]
            },
            {
                property: 'patient_name',
                rule: 'lenMin(1) && lenMax(100)',
                message: [{
                    content: 'Invalid patient name.',
                    locale: 'en'
                }]
            }
        ]
    }]);
    callback();
};

exports.tearDown = function(callback) {
    testUtils.restore([
        utils.getRegistrations,
        utils.getPatientContactUuid,
        transition.getConfig]);
    callback();
};

exports['setBirthDate sets birth_date correctly for weeks_since_birth: 0'] = function(test) {
    var doc = { fields: { weeks_since_birth: 0 } },
        expected = moment().startOf('week').toISOString();
    transition.setBirthDate(doc);
    test.ok(doc.birth_date);
    test.equals(doc.birth_date, expected);
    test.done();
};

exports['setBirthDate sets birth_date correctly for age_in_weeks 10'] = function(test) {
    var doc = { fields: { age_in_weeks: 10 } },
        expected = moment().startOf('week').subtract(10, 'weeks').toISOString();
    transition.setBirthDate(doc);
    test.ok(doc.birth_date);
    test.equals(doc.birth_date, expected);
    test.done();
};

exports['setBirthDate sets birth_date correctly for days_since_birth: 0'] = function(test) {
    var doc = { fields: { days_since_birth: 0 } },
        expected = moment().startOf('day').toISOString();
    transition.setBirthDate(doc);
    test.ok(doc.birth_date);
    test.equals(doc.birth_date, expected);
    test.done();
};

exports['setBirthDate sets birth_date correctly for age_in_days: 10'] = function(test) {
    var doc = { fields: { age_in_days: 10 } },
        expected = moment().startOf('day').subtract(10, 'days').toISOString();
    transition.setBirthDate(doc);
    test.ok(doc.birth_date);
    test.equals(doc.birth_date, expected);
    test.done();
};

exports['setBirthDate does not set birthdate if no fields given'] = function(test) {
    var doc = { };
    transition.setBirthDate(doc);
    test.equals(doc.birth_date, undefined);
    test.done();
};

exports['valid form adds patient_id and expected_date'] = function(test) {

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    // doc already exists bc we aren't testing the create patient step
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'UUID'});

    var doc = {
        form: 'BIR',
        fields: {
            patient_name: 'abc',
            weeks_since_birth: 1
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.patient_id);
        test.ok(doc.birth_date);
        test.equals(doc.tasks, undefined);
        test.done();
    });
};
