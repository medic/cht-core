var moment = require('moment'),
    validation = require('../../lib/validation'),
    db = require('../../db'),
    sinon = require('sinon').sandbox.create(),
    clock;

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['validate handles pupil parse errors'] = function(test) {
    test.expect(1);
    var doc = {
        phone: '123'
    };
    var validations = [{
        property: 'phone',
        rule: 'regex(bad no quotes)'
    }];
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(
            errors,
            ['Error on pupil validations: {"message":"Unexpected identifier","pos":2}']
        );
        test.done();
    });
};

exports['validate handles pupil regex'] = function(test) {
    test.expect(2);
    var validations = [{
        property: 'phone',
        rule: 'regex("^\\d+$")',
        message: [{
            content: 'Invalid phone {{phone}}.',
            locale: 'en'
        }]
    }];
    validation.validate({phone: '123'}, validations, function(errors) {
        test.deepEqual(errors, []);
    });
    validation.validate({phone: '123a'}, validations, function(errors) {
        test.deepEqual(errors, [{
            code:'invalid_phone',
            message:'Invalid phone {{phone}}.'
        }]);
        test.done();
    });
};

exports['pass unique validation when no doc found'] = function(test) {
    test.expect(5);
    var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: []
    });
    var validations = [{
        property: 'patient_id',
        rule: 'unique("patient_id")'
    }];
    var doc = {
        _id: 'same',
        patient_id: '111'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(view.callCount, 1);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'reports_by_freetext');
        test.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
        test.equal(errors.length, 0);
        test.done();
    });
};

exports['pass unique validation when doc is the same'] = function(test) {
    test.expect(5);
    var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{
            id: 'same',
            doc: { _id: 'same', errors: [] }
        }]
    });
    var validations = [{
        property: 'patient_id',
        rule: 'unique("patient_id")'
    }];
    var doc = {
        _id: 'same',
        patient_id: '111'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(view.callCount, 1);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'reports_by_freetext');
        test.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
        test.equal(errors.length, 0);
        test.done();
    });
};

exports['pass unique validation when doc has errors'] = function(test) {
    test.expect(7);
    var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    var fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: { errors: [{ foo: 'bar' }] }
        }]
    });
    var validations = [{
        property: 'patient_id',
        rule: 'unique("patient_id")'
    }];
    var doc = {
        _id: 'same',
        patient_id: '111'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(view.callCount, 1);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'reports_by_freetext');
        test.deepEqual(view.args[0][2], { key: ['patient_id:111'] });
        test.equal(fetch.callCount, 1);
        test.deepEqual(fetch.args[0][0], { keys: [ 'different' ] });
        test.equal(errors.length, 0);
        test.done();
    });
};

exports['fail unique validation on doc with no errors'] = function(test) {
    test.expect(1);
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: { _id: 'different', errors: [] }
        }]
    });
    var validations = [{
        property: 'xyz',
        rule: 'unique("xyz")',
        message: [{
            content: 'Duplicate: {{xyz}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        xyz: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate: {{xyz}}.'
        }]);
        test.done();
    });
};

exports['fail multiple field unique validation on doc with no errors'] = function(test) {
    test.expect(10);
    var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    var fetch = sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: { _id: 'different', errors: [] }
        }]
    });
    var validations = [{
        property: 'xyz',
        rule: 'unique("xyz","abc")',
        message: [{
            content: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        xyz: '444',
        abc: 'cheese'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(view.callCount, 2);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'reports_by_freetext');
        test.deepEqual(view.args[0][2], { key: ['xyz:444'] });
        test.equal(view.args[1][0], 'medic-client');
        test.equal(view.args[1][1], 'reports_by_freetext');
        test.deepEqual(view.args[1][2], { key: ['abc:cheese'] });
        test.equal(fetch.callCount, 1);
        test.deepEqual(fetch.args[0][0], { keys: [ 'different' ] });
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate xyz {{xyz}} and abc {{abc}}.'
        }]);
        test.done();
    });
};

exports['pass uniqueWithin validation on old doc'] = function(test) {
    test.expect(1);
    clock = sinon.useFakeTimers();
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: {
                _id: 'different',
                errors: [],
                reported_date: moment().subtract(3, 'weeks').valueOf()
            }
        }]
    });
    var validations = [{
        property: 'xyz',
        rule: 'uniqueWithin("xyz","2 weeks")',
        message: [{
            content: 'Duplicate xyz {{xyz}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        xyz: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(errors.length, 0);
        test.done();
    });
};

exports['fail uniqueWithin validation on new doc'] = function(test) {
    test.expect(1);
    clock = sinon.useFakeTimers();
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: {
                _id: 'different',
                errors: [],
                reported_date: moment().subtract(1, 'weeks').valueOf()
            }
        }]
    });
    var validations = [{
        property: 'xyz',
        rule: 'uniqueWithin("xyz","2 weeks")',
        message: [{
            content: 'Duplicate xyz {{xyz}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        xyz: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(errors, [{
            code: 'invalid_xyz_uniqueWithin',
            message: 'Duplicate xyz {{xyz}}.'
        }]);
        test.done();
    });
};

exports['formatParam does not encode unicode'] = function(test) {
    test.same(validation._formatParam('form', 'द'), 'form:"द"');
    test.done();
};

exports['formatParam escapes quotes in values'] = function(test) {
    test.same(
        validation._formatParam('form', ' " AND everything'),
        'form:" \\" AND everything"'
    );
    test.done();
};

exports['formatParam rejects quotes in field names'] = function(test) {
    test.same(
        validation._formatParam('*:"everything', 'xyz'),
        '*:everything:"xyz"'
    );
    test.done();
};

exports['formatParam quotes strings'] = function(test) {
    test.same(
        validation._formatParam('birds', 'pigeon'),
        'birds:"pigeon"'
    );
    test.done();
};

exports['formatParam use <int> query on integers'] = function(test) {
    test.same(
        validation._formatParam('lmp', 11),
        'lmp<int>:11'
    );
    test.done();
};

exports['pass exists validation when matching document'] = function(test) {
    test.expect(8);
    var view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{ id: 'different' }]
    });
    sinon.stub(db.medic, 'fetch').callsArgWith(1, null, {
        rows: [{
            id: 'different',
            doc: { _id: 'different', errors: [] }
        }]
    });
    var validations = [{
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [{
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        patient_id: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.equal(view.callCount, 2);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'reports_by_freetext');
        test.deepEqual(view.args[0][2], { key: ['patient_id:444'] });
        test.equal(view.args[1][0], 'medic-client');
        test.equal(view.args[1][1], 'reports_by_freetext');
        test.deepEqual(view.args[1][2], { key: ['form:REGISTRATION'] });
        test.deepEqual(errors, []);
        test.done();
    });
};

exports['fail exists validation when no matching document'] = function(test) {
    test.expect(1);
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: []
    });
    var validations = [{
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [{
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        parent_id: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(errors, [{
            code: 'invalid_parent_id_exists',
            message: 'Unknown patient {{parent_id}}.'
        }]);
        test.done();
    });
};

exports['fail exists validation when matching document is same as this'] = function(test) {
    test.expect(1);
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [{
            id: 'same',
            doc: { _id: 'same', errors: [] }
        }]
    });
    var validations = [{
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [{
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en'
        }]
    }];
    var doc = {
        _id: 'same',
        parent_id: '444'
    };
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(errors, [{
            code: 'invalid_parent_id_exists',
            message: 'Unknown patient {{parent_id}}.'
        }]);
        test.done();
    });
};
