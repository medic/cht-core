var _ = require('underscore'),
    transition = require('../../transitions/registration'),
    sinon = require('sinon').sandbox.create(),
    moment = require('moment'),
    transitionUtils = require('../../transitions/utils'),
    utils = require('../../lib/utils');

function getMessage(doc) {
    if (!doc || !doc.tasks) {
        return;
    }
    return _.first(_.first(doc.tasks).messages).message;
}

exports.setUp = function(callback) {
    sinon.stub(transition, 'getConfig').returns([{
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
    },{
        // Pregnancy for existing patient
        form: 'ep',
        type: 'pregnancy',
        events: [
           // See, no patient id creation!
           // {
           //     name: 'on_create',
           //     trigger: 'add_patient_id',
           //     params: '',
           //     bool_expr: ''
           // },
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
                    property: 'patient_id',
                    rule: 'len(5)',
                    message: [{
                        content: 'Invalid patient Id.',
                        locale: 'en'
                    }]
                }
            ]
        }
    }]);
    callback();
};

exports.tearDown = function(callback) {
    sinon.restore();

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
    var doc = { form: 'p', type: 'data_record'};
    sinon.stub(utils, 'getClinicPhone').returns(null);
    sinon.stub(utils, 'getForm').returns({ public_form: false });
    test.ok(!transition.filter(doc));
    test.done();
};

exports['filter does not fail if doc has errors'] = function(test) {
    var doc = { form: 'p', type: 'data_record', errors: [ 'some error ' ] };
    sinon.stub(utils, 'getClinicPhone').returns('somephone');
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    test.ok(transition.filter(doc));
    test.done();
};

exports['filter fails if form is unknown'] = function(test) {
    var doc = { form: 'x' , type: 'data_record'};
    sinon.stub(utils, 'getClinicPhone').returns('somephone');
    test.ok(!transition.filter(doc));
    test.done();
};

exports['filter succeeds with no clinic phone if public form'] = function(test) {
    var doc = { form: 'p' , type: 'data_record'};
    sinon.stub(utils, 'getClinicPhone').returns(null);
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    test.ok(transition.filter(doc));
    test.done();
};

exports['filter succeeds with populated doc'] = function(test) {
    var doc = { form: 'p' , type: 'data_record'};
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
    var doc = { fields: { lmp: 0 }, type: 'data_record' };
    transition.setExpectedBirthDate(doc);
    test.equals(doc.lmp_date, null);
    test.equals(doc.expected_date, null);
    test.done();
};

exports['setExpectedBirthDate sets lmp_date and expected_date correctly for lmp: 10'] = function(test) {
    var doc = { fields: { lmp: '10', type: 'data_record'} },
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

    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    sinon.stub(transitionUtils, 'addUniqueId', (db, doc, callback) => {
        doc.patient_id = 12345;
        callback();
    });

    doc = {
        form: 'p',
        type: 'data_record',
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

exports['pregnancies on existing patients fail without valid patient id'] = function(test) {
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);

    var doc = {
        form: 'ep',
        type: 'data_record',
        fields: {
            patient_id: '12345',
            lmp: 5
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.equals(doc.errors.length, 1);
        test.equals(doc.errors[0].message, 'messages.generic.registration_not_found');
        test.done();
    });
};

exports['pregnancies on existing patients succeeds with a valid patient id'] = function(test) {
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    var doc = {
        form: 'ep',
        type: 'data_record',
        fields: {
            patient_id: '12345',
            lmp: 5
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, changed) {
        test.equals(err, null);
        test.equals(changed, true);
        test.ok(!doc.errors);
        test.done();
    });
};


exports['zero lmp value only registers patient'] = function(test) {
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    sinon.stub(transitionUtils, 'addUniqueId', (db, doc, callback) => {
        doc.patient_id = 12345;
        callback();
    });

    var doc = {
        form: 'p',
        type: 'data_record',
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

    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    sinon.stub(transitionUtils, 'addUniqueId', (db, doc, callback) => {
        doc.patient_id = 12345;
        callback();
    });

    doc = {
        form: 'p',
        type: 'data_record',
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

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});

    doc = {
        form: 'p',
        from: '+12345',
        type: 'data_record',
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
        form: 'p',
        from: '+1234',
        type: 'data_record',
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
        form: 'p',
        from: '+1234',
        type: 'data_record',
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
        form: 'p',
        from: '+123',
        type: 'data_record',
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
            form: 'x',
            type: 'data_record'
        }
    }, {}, {}, function(err, changed) {
        test.equals(changed, undefined);
        test.done();
    });
};

exports['missing all fields returns validation errors'] = function(test) {
    test.expect(2);
    var doc = {
        form: 'p',
        from: '+123',
        type: 'data_record'
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
