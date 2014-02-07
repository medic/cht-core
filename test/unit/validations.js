var validation = require('../../lib/validation'),
    underscore = require('underscore'),
    utils = require('../../lib/utils'),
    sinon = require('sinon');


exports.tearDown = function(callback) {
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    callback();
}

exports['validate handles pupil parse errors'] = function(test) {
    test.expect(1);
    var doc = {
        phone: '123'
    };
    var validations = [{
        "property": "phone",
        "rule": 'regex(bad no quotes)',
        "message": "Invalid phone {{phone}}."
    }];
    validation.validate(doc, validations, function(errors) {
        test.deepEqual(
            errors,
            ['Error on pupil validations: {"message":"Unexpected identifier","pos":2}']
        );
        test.done();
    });
}

exports['validate handles pupil regex'] = function(test) {
    test.expect(2);
    var validations = [{
        "property": "phone",
        "rule": "regex('^\\d+$')",
        "message": "Invalid phone {{phone}}."
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
}

exports['pass unique("patient_id") validation when doc has errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [{
        doc: { errors: [{foo:'bar'}] }
    }]);
    var validations = [{
        "property": "patient_id",
        "rule": "unique('patient_id')",
        "message": "Duplicate patient id."
    }];
    var doc = {patient_id: '111'};
    validation.validate(doc, validations, function(errors) {
        test.equals(getRegistrations.called, true);
        test.deepEqual(errors, []);
        test.done();
    });
}

exports['fail unique("patient_id") validation on doc with no errors'] = function(test) {
    test.expect(2);
    // simulate view results with doc attribute
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [{
        doc: { errors: [] }
    }]);
    var validations = [{
        "property": "patient_id",
        "rule": "unique('patient_id')",
        "message": "Duplicate patient id {{patient_id}}."
    }];
    var doc = {patient_id: '444'};
    validation.validate(doc, validations, function(errors) {
        test.equals(getRegistrations.called, true);
        test.deepEqual(errors, [{
            code:'invalid_patient_id_unique',
            message:'Duplicate patient id {{patient_id}}.'
        }]);
        test.done();
    });
}
