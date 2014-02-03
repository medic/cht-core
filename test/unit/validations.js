var validation = require('../../lib/validation'),
    underscore = require('underscore');

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
