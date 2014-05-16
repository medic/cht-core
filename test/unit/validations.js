var validation = require('../../lib/validation'),
    underscore = require('underscore'),
    utils = require('../../lib/utils'),
    db = require('../../db'),
    sinon = require('sinon');


exports.tearDown = function(callback) {
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    if (db.fti.restore) {
        db.fti.restore();
    }
    callback();
};

exports['validate handles pupil parse errors'] = function(test) {
    test.expect(1);
    var doc = {
        phone: '123'
    };
    var validations = [{
        "property": "phone",
        "rule": 'regex(bad no quotes)'
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
        "property": "phone",
        "rule": "regex('^\\d+$')",
        "message": [{
            content: "Invalid phone {{phone}}.",
            locale: "en"
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

exports['pass unique validation when doc has errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, [{
        doc: { errors: [{foo: 'bar'}] }
    }]);
    var validations = [{
        "property": "patient_id",
        "rule": "unique('patient_id')"
    }];
    var doc = {patient_id: '111'};
    validation.validate(doc, validations, function(errors) {
        test.ok(fti.calledWith('data_records', {
            patient_id: '111',
            include_docs: true
        }));
        test.deepEqual(errors, []);
        test.done();
    });
};

exports['fail unique validation on doc with no errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, [{
        doc: { errors: [] }
    }]);
    var validations = [{
        "property": "xyz",
        "rule": "unique('xyz')",
        "message": [{
            content: "Duplicate patient id {{xyz}}.",
            locale: "en"
        }]
    }];
    var doc = {xyz: '444'};
    validation.validate(doc, validations, function(errors) {
        test.ok(fti.calledWith('data_records', {
            xyz: '444',
            include_docs: true
        }));
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate patient id {{xyz}}.'
        }]);
        test.done();
    });
};

exports['fail multiple field unique validation on doc with no errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, [{
        doc: { errors: [] }
    }]);
    var validations = [{
        "property": "xyz",
        "rule": "unique('xyz','abc')",
        "message": [{
            content: "Duplicate xyz {{xyz}} and abc {{abc}}.",
            locale: "en"
        }]
    }];
    var doc = {xyz: '444', abc: 'cheese'};
    validation.validate(doc, validations, function(errors) {
        test.ok(fti.calledWith('data_records', {
            xyz: '444',
            abc: 'cheese',
            include_docs: true
        }));
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate xyz {{xyz}} and abc {{abc}}.'
        }]);
        test.done();
    });
};