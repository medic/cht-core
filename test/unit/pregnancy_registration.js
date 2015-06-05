var _ = require('underscore'),
    transition = require('../../transitions/registration'),
    sinon = require('sinon'),
    moment = require('moment'),
    utils = require('../../lib/utils');

function getMessage(doc) {
    if (!doc || !doc.tasks) {
        return;
    }
    return _.first(_.first(doc.tasks).messages).message;
}

exports.setUp = function(callback) {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'y',
        type: 'pregnancy',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           },
           {
               name: 'on_create',
               trigger: 'add_expected_date',
               params: '',
               bool_expr: 'typeof doc.getid === "undefined"'
           }
        ],
        validations: {
            join_responses: true,
            list: [
                {
                    property: 'lmp',
                    rule: 'min(0) && max(40)',
                    message: [{
                        content: 'Invalid LMP; must be between 0-40 weeks.',
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
        }
    },{
        form: 'p',
        type: 'pregnancy',
        events: [
           {
               name: 'on_create',
               trigger: 'add_patient_id',
               params: '',
               bool_expr: ''
           },
           {
               name: 'on_create',
               trigger: 'add_expected_date',
               params: '',
               bool_expr: 'typeof doc.getid === "undefined"'
           }
        ],
        validations: {
            join_responses: true,
            list: [
                {
                    property: 'lmp',
                    rule: 'min(0) && max(40)',
                    message: [{
                        content: 'Invalid LMP; must be between 0-40 weeks.',
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
        }
    }]);
    callback();
};

exports.tearDown = function(callback) {
    _.each([
        utils.getRegistrations,
        utils.getClinicPhone,
        transition.getConfig,
        utils.getForm
    ], function(o) {
        if (o.restore) {
            o.restore();
        }
    });
    callback();
};

exports['filter exists'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.ok(transition.filter.length >= 1);
    test.done();
};

exports['filter fails with empty doc'] = function(test) {
    test.ok(!transition.filter({}));
    test.done();
};

exports['filter fails with no clinic phone and private form'] = function(test) {
    var doc = { form: 'y' };
    sinon.stub(utils, 'getClinicPhone').returns(null);
    sinon.stub(utils, 'getForm').returns({ public_form: false });
    test.ok(!transition.filter(doc));
    test.done();
};

exports['filter does not fail if doc has errors'] = function(test) {
    var doc = { form: 'y', errors: [ 'some error ' ] };
    sinon.stub(utils, 'getClinicPhone').returns('somephone');
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    test.ok(transition.filter(doc));
    test.done();
};

exports['filter fails if form is unknown'] = function(test) {
    var doc = { form: 'x' };
    sinon.stub(utils, 'getClinicPhone').returns('somephone');
    test.ok(!transition.filter(doc));
    test.done();
};

exports['filter succeeds with no clinic phone if public form'] = function(test) {
    var doc = { form: 'p' };
    sinon.stub(utils, 'getClinicPhone').returns(null);
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    test.ok(transition.filter(doc));
    test.done();
};

exports['filter succeeds with populated doc'] = function(test) {
    var doc = { form: 'y' };
    sinon.stub(utils, 'getClinicPhone').returns('somephone');
    sinon.stub(utils, 'getForm').returns({});
    test.ok(transition.filter(doc));
    test.done();
};

exports['is id only'] = function(test) {
    test.equals(transition.isIdOnly({}), false);
    test.equals(transition.isIdOnly({
        getid: undefined
    }), false);
    test.equals(transition.isIdOnly({
        getid: ''
    }), false);
    test.equals(transition.isIdOnly({
        getid: 'x'
    }), true);
    test.done();
};

exports['setExpectedBirthDate sets lmp_date and expected_date to null when lmp 0'] = function(test) {
    var doc = { fields: { lmp: 0 } };
    transition.setExpectedBirthDate(doc);
    test.equals(doc.lmp_date, null);
    test.equals(doc.expected_date, null);
    test.done();
};

exports['setExpectedBirthDate sets lmp_date and expected_date correctly for lmp: 10'] = function(test) {
    var doc = { fields: { lmp: '10' } },
        start = moment().startOf('week');

    transition.setExpectedBirthDate(doc);

    test.ok(doc.lmp_date);
    test.equals(doc.lmp_date, start.clone().subtract(10, 'weeks').toISOString());
    test.equals(doc.expected_date, start.clone().add(30, 'weeks').toISOString());

    test.done();
};

exports['valid adds lmp_date and patient_id'] = function(test) {
    test.expect(5);
    var doc,
        start = moment().startOf('week').subtract(5, 'weeks');

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    doc = {
        form: 'y',
        fields: {
            patient_name: 'abc',
            lmp: 5
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.lmp_date, start.toISOString());
        test.ok(doc.patient_id);
        test.equals(doc.tasks, undefined);
        test.done();
    });
};

exports['zero lmp value only registers patient'] = function(test) {

    test.expect(5);

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    var doc = {
        form: 'y',
        fields: {
            patient_name: 'abc',
            lmp: 0
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.lmp_date, null);
        test.ok(doc.patient_id);
        test.equals(doc.tasks, undefined);
        test.done();
    });
};

exports['id only logic with valid name'] = function(test) {
    var doc;

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    doc = {
        form: 'y',
        fields: {
            patient_name: 'abc',
            lmp: 5
        },
        getid: 'x'
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.lmp_date, undefined);
        test.ok(doc.patient_id);

        test.done();
    });
};

exports['id only logic with invalid name'] = function(test) {
    test.expect(5);
    var doc;

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    doc = {
        form: 'y',
        from: '+12345',
        fields: {
            patient_name: '',
            lmp: 5
        },
        getid: 'x'
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.patient_id, undefined);
        test.ok(doc.tasks);
        test.equals(getMessage(doc), 'Invalid patient name.');
        test.done();
    });
};

exports['invalid name valid LMP logic'] = function(test) {
    test.expect(4);

    var doc;

    doc = {
        form: 'y',
        from: '+1234',
        fields: {
            patient_name: '',
            lmp: 5
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'Invalid patient name.');

        test.done();
    });
};

exports['valid name invalid LMP logic'] = function(test) {
    var doc;

    doc = {
        form: 'y',
        from: '+1234',
        fields: {
            patient_name: 'hi',
            lmp: 45
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'Invalid LMP; must be between 0-40 weeks.');

        test.done();
    });
};

exports['invalid name invalid LMP logic'] = function(test) {
    var doc;

    doc = {
        form: 'y',
        from: '+123',
        fields: {
            patient_name: '',
            lmp: 45
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'Invalid patient name.  Invalid LMP; must be between 0-40 weeks.');

        test.done();
    });
};

exports['mismatched form returns false'] = function(test) {
    transition.onMatch({
        doc: {
            form: 'x'
        }
    }, {}, {}, function(err, changed) {
        test.equals(changed, undefined);
        test.done();
    });
};

exports['missing all fields returns validation errors'] = function(test) {
    test.expect(2);
    var doc = {
        form: 'y',
        from: '+123'
    };
    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(changed, true);
        test.equals(
            getMessage(doc),
            'Invalid LMP; must be between 0-40 weeks.  Invalid patient name.'
        );
        test.done();
    });
};
