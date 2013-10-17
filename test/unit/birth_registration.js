var _ = require('underscore'),
    transition = require('../../transitions/patient_registration'),
    sinon = require('sinon'),
    moment = require('moment'),
    utils = require('../../lib/utils'),
    related_entities,
    config;

related_entities = {
    clinic: {
        contact: {
            phone: '+1234'
        }
    }
};

function getMessage(doc) {
    if (!doc || !doc.tasks) return;
    return _.first(_.first(doc.tasks).messages).message;
}

exports.setUp = function(callback) {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'BIR',
        type: 'birth',
        validations: [
            {
                property: 'weeks_since_birth',
                rule: 'min(0) && max(52)',
                message: 'Invalid DOB; must be between 0-52 weeks.'
            },
            {
                property: 'patient_name',
                rule: 'lenMin(1) && lenMax(100)',
                message: 'Invalid patient name.'
            }
        ]
    }]);
    callback();
};

exports.tearDown = function(callback) {
    if (utils.getRegistrations.restore)
        utils.getRegistrations.restore();

    if (transition.getConfig.restore)
        transition.getConfig.restore();

    callback();
}

exports['filter passes until we have patient_id and expected_date'] = function(test) {
    test.equals(transition.filter({
        form: 'BIR',
        reported_date: 'x',
        related_entities: {clinic: {contact: {phone: 'x'}}},
        patient_name: 'x',
        weeks_since_birth: 1,
        errors: []
    }), true);
    test.equals(transition.filter({
        form: 'BIR',
        reported_date: 'x',
        related_entities: {clinic: {contact: {phone: 'x'}}},
        patient_name: 'x',
        weeks_since_birth: 1,
        lmp_date: moment().toISOString(),
        errors: []
    }), true);
    test.equals(transition.filter({
        form: 'BIR',
        reported_date: 'x',
        related_entities: {clinic: {contact: {phone: 'x'}}},
        patient_name: 'x',
        weeks_since_birth: 1,
        patient_id: 'xyz',
        expected_date: moment().toISOString(),
        errors: []
    }), false);
    test.done();
};

exports['setBirthDate sets birth_date correctly for weeks_since_birth: 0'] = function(test) {
    var doc,
        start = moment().startOf('week');
    doc = {
        weeks_since_birth: 0
    };
    transition.setBirthDate(doc);
    test.ok(doc.birth_date);
    test.equals(doc.birth_date, start.clone().add(0, 'weeks').toISOString());
    test.done();
};
