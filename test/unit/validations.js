var moment = require('moment'),
    validation = require('../../lib/validation'),
    utils = require('../../lib/utils'),
    db = require('../../db'),
    sinon = require('sinon'),
    clock;

exports.tearDown = function(callback) {
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    if (db.fti.restore) {
        db.fti.restore();
    }
    if (clock && clock.restore) {
        clock.restore();
    }
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
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
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
        test.ok(fti.calledWith('data_records', {
            q: 'patient_id:"111"',
            include_docs: true
        }));
        test.deepEqual(errors, []);
        test.done();
    });
};

exports['pass unique validation when doc is the same'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'same',
            doc: { errors: [] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'patient_id:"111"',
            include_docs: true
        }));
        test.deepEqual(errors, []);
        test.done();
    });
};

exports['pass unique validation when doc has errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'different',
            doc: { errors: [{foo: 'bar'}] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'patient_id:"111"',
            include_docs: true
        }));
        test.deepEqual(errors, []);
        test.done();
    });
};

exports['fail unique validation on doc with no errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'different',
            doc: { errors: [] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'xyz:"444"',
            include_docs: true
        }));
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate: {{xyz}}.'
        }]);
        test.done();
    });
};

exports['fail multiple field unique validation on doc with no errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'different',
            doc: { errors: [] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'xyz:"444" AND abc:"cheese"',
            include_docs: true
        }));
        test.deepEqual(errors, [{
            code: 'invalid_xyz_unique',
            message: 'Duplicate xyz {{xyz}} and abc {{abc}}.'
        }]);
        test.done();
    });
};

exports['pass uniqueWithin validation on old doc'] = function(test) {
    test.expect(2);
    clock = sinon.useFakeTimers();
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'different',
            doc: { errors: [] } 
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
        var start = moment().subtract(2, 'weeks').toISOString();
        test.ok(fti.calledWith('data_records', {
            q: 'xyz:"444" AND reported_date<date>:[' + start + ' TO 3000-01-01T00:00:00]',
            include_docs: true
        }));

        test.deepEqual(errors, [{
            code: 'invalid_xyz_uniqueWithin',
            message: 'Duplicate xyz {{xyz}}.'
        }]);
        test.done();
        
    });
};

exports['pass exists validation when matching document'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'different',
            doc: { errors: [] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'form:"REGISTRATION" AND patient_id:"444"',
            include_docs: true
        }));

        test.deepEqual(errors, []);
        test.done();
        
    });
};

exports['fail exists validation when no matching document'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
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
        test.ok(fti.calledWith('data_records', {
            q: 'form:"REGISTRATION" AND patient_id:"444"',
            include_docs: true
        }));

        test.deepEqual(errors, [{
            code: 'invalid_parent_id_exists',
            message: 'Unknown patient {{parent_id}}.'
        }]);
        test.done();
        
    });
};

exports['fail exists validation when matching document is same as this'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var fti = sinon.stub(db, 'fti').callsArgWithAsync(2, null, {
        rows: [{
            id: 'same',
            doc: { errors: [] } 
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
        test.ok(fti.calledWith('data_records', {
            q: 'form:"REGISTRATION" AND patient_id:"444"',
            include_docs: true
        }));

        test.deepEqual(errors, [{
            code: 'invalid_parent_id_exists',
            message: 'Unknown patient {{parent_id}}.'
        }]);
        test.done();
        
    });
};
