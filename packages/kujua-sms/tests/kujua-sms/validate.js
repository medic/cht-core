var validate = require('kujua-sms/validate');

exports.validate = function(test) {
    var form, form_definition, form_data, errors;

    /*
     * check that missing fields are logged
     * as errors.
     */

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


    /*
     * check that unrequired fields do not
     * produce errors.
     */

    form_definition.fields["def"].required = false;
    errors = validate.validate(form_definition, form_data);
    test.same(errors.length, 0);

    /*
     * check that nested fields work.
     */

    form_definition.fields["abc.hij"] = {
        _key: "abc.hij",
        labels: "abcabc",
        required: true
    };
    form_definition.fields["def.hij"] = {
        _key: "def.hij",
        labels: "defdef",
        required: true
    };
    form_data = {
        abc: { hij: 1 },
        def: { xyz: 3 }
    }
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], {code: "missing_fields", fields: ["def.hij"]});

    /*
     * check form data with labels.
     */

    form_data = {
        abc: {
            hij: [ '1', 'abcabc' ]
        },
        def: {
            hij: [ null, 'defdef' ]
        }
    }
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], {code: "missing_fields", fields: ["def.hij"]});

    test.done();
};
