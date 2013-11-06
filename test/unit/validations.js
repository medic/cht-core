var validation = require('../../lib/validation'),
    underscore = require('underscore');

exports['validate handles pupil parse errors'] = function(test) {
    var doc = {
        phone: '123'
    };
    var validations = [{
        "property": "phone",
        "rule": 'regex(bad no quotes)',
        "message": "Invalid phone {{phone}}."
    }];
    var errors = validation.validate(doc, validations);
    test.deepEqual(
        errors,
        ['Error running validations: {"message":"Unexpected identifier","pos":2}']
    );
    test.done();
}

exports['validate handles pupil regex'] = function(test) {
    var doc = {
        phone: '123'
    };
    var validations = [{
        "property": "phone",
        "rule": "regex('^\\d+$')",
        "message": "Invalid phone {{phone}}."
    }];
    var errors = validation.validate(doc, validations);
    test.deepEqual(errors, []);
    doc = {
        phone: '123a'
    };
    errors = validation.validate(doc, validations);
    test.deepEqual(errors, ['Invalid phone {{phone}}.']);
    test.done();
}
