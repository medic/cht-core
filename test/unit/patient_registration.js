var _ = require('underscore'),
    moment = require('moment'),
    transition = require('../../transitions/registration'),
    sinon = require('sinon'),
    utils = require('../../lib/utils'),
    testUtils = require('../test_utils'),
    date = require('../../date');

function getMessage(doc, idx) {
    if (!doc || !doc.tasks) {
        return;
    }
    if (idx) {
        if (!doc.tasks[idx]) {
            return;
        }
        return _.first(doc.tasks[idx].messages);
    }
    return _.first(_.first(doc.tasks).messages);
}

exports.setUp = function(callback) {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           }
        ],
        validations: [
            {
                property: 'patient_name',
                rule: 'lenMin(1) && lenMax(100)',
                message: 'Invalid patient name.'
            }
        ],
        messages: [
            {
                message: [
                    {
                        content: 'thanks {{contact.name}}',
                        locale: 'en'
                    },
                    {
                        content: 'gracias {{contact.name}}',
                        locale: 'es'
                    }
                ],
                recipient: 'reporting_unit',
            },
            {
                message: [
                    {
                        content: 'thanks {{fields.caregiver_name}}',
                        locale: 'en'
                    },
                    {
                        content: 'gracias {{fields.caregiver_name}}',
                        locale: 'es'
                    }
                ],
                recipient: 'caregiver_phone',
            }
        ]
    }]);
    callback();
};

exports.tearDown = function(callback) {
    testUtils.restore([
        utils.getRegistrations,
        utils.getPatientContactUuid,
        transition.getConfig,
        transition.getWeeksSinceDOB,
        transition.getDaysSinceDOB,
        date.getDate]);
    callback();
};

exports['getWeeksSinceLMP returns 0 not NaN or null'] = function(test) {
    test.equal(transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 0);
    test.equal(typeof transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 'number');
    test.equal(transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }), 0);
    test.equal(typeof transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }), 'number');
    test.equal(transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }), 0);
    test.equal(typeof transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }), 'number');
    test.done();
};

exports['getWeeksSinceLMP always returns number'] = function(test) {
    test.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
    test.done();
};

exports['getWeeksSinceLMP supports three property names'] = function(test) {
    test.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
    test.equal(transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: '12' } }), 12);
    test.equal(transition.getWeeksSinceLMP({ fields: { last_menstrual_period: '12' } }), 12);
    test.done();
};

exports['getWeeksSinceDOB supports four property names'] = function(test) {
    test.equal(transition.getWeeksSinceDOB({ fields: { dob: '12' } }), 12);
    test.equal(transition.getWeeksSinceDOB({ fields: { weeks_since_dob: '12' } }), 12);
    test.equal(transition.getWeeksSinceDOB({ fields: { weeks_since_birth: '12' } }), 12);
    test.equal(transition.getWeeksSinceDOB({ fields: { age_in_weeks: '12' } }), 12);
    test.done();
};

exports['getDaysSinceDOB supports three property names'] = function(test) {
    test.equal(transition.getDaysSinceDOB({ fields: { days_since_dob: '12' } }), 12);
    test.equal(transition.getDaysSinceDOB({ fields: { days_since_birth: '12' } }), 12);
    test.equal(transition.getDaysSinceDOB({ fields: { age_in_days: '12' } }), 12);
    test.done();
};

exports['getDOB uses weeks since dob if available'] = function(test) {
    var today = 1474942416907,
        expected = moment(today).startOf('week').subtract(5, 'weeks').valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns('5');
    test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
    test.done();
};

exports['getDOB uses days since dob if available'] = function(test) {
    var today = 1474942416907,
        expected = moment(today).startOf('day').subtract(5, 'days').valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
    sinon.stub(transition, 'getDaysSinceDOB').returns('5');
    test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
    test.done();
};

exports['getDOB falls back to today if necessary'] = function(test) {
    var today = 1474942416907,
        expected = moment(today).startOf('day').valueOf();
    sinon.stub(date, 'getDate').returns(today);
    sinon.stub(transition, 'getWeeksSinceDOB').returns(undefined);
    sinon.stub(transition, 'getDaysSinceDOB').returns(undefined);
    test.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
    test.done();
};

exports['isBoolExprFalse returns false/true based on regex'] = function(test) {
    var regex1 = '/^\\s*[5]\\d+/.test(doc.foo)',
        regex2 = '/^\\s*[3]\\d+/.test(doc.foo)',
        doc = {
            foo: '533884'
        };
    test.equal(transition.isBoolExprFalse(doc, regex1), false);
    test.equal(transition.isBoolExprFalse(doc, regex2), true);
    // undefined expr always returns true
    test.equal(transition.isBoolExprFalse(doc), false);
    test.done();
};

exports['valid form adds patient_id and patient document'] = function(test) {

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);

    var doc = {
        form: 'PATR',
        fields: { patient_name: 'abc' },
        reported_date: 'now'
    };

    var db = {
        medic: {
            view: sinon.stub().callsArgWith(3, null, {rows: [
                {
                    doc: {
                        parent: {
                            _id: 'the-parent'
                        }
                    }
                }
            ]})
        }
    };

    var auditDb = {
        saveDoc: sinon.stub().callsArgWith(1)
    };

    transition.onMatch({
        doc: doc
    }, db, auditDb, function(err, complete) {
        test.equal(err, null);
        test.equal(complete, true);
        test.ok(doc.patient_id);
        test.ok(auditDb.saveDoc.called);

        test.deepEqual(auditDb.saveDoc.args[0][0],
            {
                name: 'abc',
                parent: {
                    _id: 'the-parent'
                },
                reported_date: 'now',
                type: 'person',
                patient_id: doc.patient_id
            });
        test.equal(doc.tasks, undefined);
        test.done();
    });
};

exports['registration sets up responses'] = function(test) {

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    var doc = {
        form: 'PATR',
        from: '+1234',
        fields: {
            patient_name: 'foo',
            caregiver_name: 'Sam',
            caregiver_phone: '+987',
        },
        contact: {
            phone: '+1234',
            name: 'Julie'
        },
        locale: 'en'
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equal(err, null);
        test.equal(complete, true);
        test.ok(doc.tasks);
        test.equal(doc.tasks && doc.tasks.length, 2);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks Julie'
            });
        }

        /*
         * Also checks that recipient using doc property value is handled
         * resolved correctly
         * */
        var msg1 = getMessage(doc, 1);
        test.ok(msg1);
        test.ok(msg1.uuid);
        test.ok(msg1.to);
        test.ok(msg1.message);
        if (msg1) {
            delete msg1.uuid;
            test.deepEqual(msg1, {
                to: '+987',
                message: 'thanks Sam'
            });
        }
        test.done();
    });
};

exports['registration responses support locale'] = function(test) {

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    var doc = {
        form: 'PATR',
        fields: {
            patient_name: 'foo',
            caregiver_name: 'Sam',
            caregiver_phone: '+987',
        },
        contact: {
            phone: '+1234',
            name: 'Julie',
            parent: {
                contact: {
                    phone: '+1234',
                    name: 'Julie'
                }
            }
        },
        locale: 'es' //spanish
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equal(err, null);
        test.equal(complete, true);
        test.ok(doc.tasks);
        test.equal(doc.tasks && doc.tasks.length, 2);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'gracias Julie'
            });
        }

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getMessage(doc, 1);
        test.ok(msg1);
        test.ok(msg1.uuid);
        test.ok(msg1.to);
        test.ok(msg1.message);
        if (msg1) {
            delete msg1.uuid;
            test.deepEqual(msg1, {
                to: '+987',
                message: 'gracias Sam'
            });
        }
        test.done();
    });
};
