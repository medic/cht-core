var validate = require('kujua-sms/validate');

/*
 * check that missing fields are logged as errors.
 */
exports.missing_fields_errors = function(test) {
    test.expect(1);
    var form, form_definition, form_data, errors;

    form = "TEST";
    form_definition = {
        fields: {
            "abc": {_key: "abc", labels: "abcabc", required: true},
            "def": {_key: "def", labels: "defdef", required: true}
        }
    };
    form_data = {
        abc: 1,
        hij: 3
    };
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], {code: 'missing_fields', fields: ['def']});
    test.done();
};


/*
 * check that unrequired fields do not produce errors.
 */
exports.validate_not_required = function(test) {
    test.expect(1);
    var form, form_definition, form_data, errors;
    form_definition = {
        fields: {
            "abc": {_key: "abc", labels: "abcabc", required: true},
            "def": {_key: "def", labels: "defdef", required: false}
        }
    };
    form_data = {
        abc: 1
    };

    // not required
    form_definition.fields["def"].required = false;

    errors = validate.validate(form_definition, form_data);
    test.same(errors.length, 0);
    test.done();
};


/*
 * check that nested fields work.
 */
exports.nested_fields_missing = function(test) {

    test.expect(1);
    var form_definition, form_data, errors;
    form_definition = {
        fields: {
            "abc.hij": {
                _key: "abc.hij",
                labels: "abcabc",
                required: true
            },
            "def.hij": {
                _key: "def.hij",
                labels: "defdef",
                required: true
            }
        }
    };
    form_data = {
        abc: { hij: 1 },
        def: { xyz: 3 }
    }
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], {code: "missing_fields", fields: ["def.hij"]});
    test.done();

};

/*
 * check form data with labels.
 */
exports.form_data_with_labels = function(test) {

    test.expect(1);
    var form_definition = {
        fields: {
            "abc.hij": {
                _key: "abc.hij",
                labels: "abcabc",
                required: true
            },
            "def.hij": {
                _key: "def.hij",
                labels: "defdef",
                required: true
            }
        }
    };

    var form_data = {
        abc: {
            hij: [ '1', 'abcabc' ]
        },
        def: {
            hij: [ null, 'defdef' ]
        }
    }
    var errors = validate.validate(form_definition, form_data);
    test.same(errors[0], {code: "missing_fields", fields: ["def.hij"]});

    test.done();
};

/*
 * Support custom validation function.
 */
exports.custom_validations_function = function(test) {
    test.expect(1);
    var def = {
        meta: {
            code: "FOO"
        },
        fields: {
            foo: {
                _key: "foo",
                required: true
            }
        },
        validations: {
            check1: "function() { " +
                    "   if (form_data['foo'] !== '3') { return 'Arg.' } " +
                    "}"
        }
    };
    var data = { foo: 2 },
        errors = validate.validate(def, data);

    test.same(errors[0], {code:"form_invalid_custom", form:"FOO", message:"Arg."});
    test.done();
};
