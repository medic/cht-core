var validate = require('kujua-sms/validate');

exports.validate = function(test) {
    var form, form_definition, form_data, errors;
    
    /*
     * check that missing fields are logged
     * as errors.
     */
     
    form = "TEST";
    form_definition = {
        fields: [
            {key: "abc", label: "abcabc", required: true},
            {key: "def", label: "defdef", required: true}
        ]
    };
    form_data = {
        abc: 1,
        hij: 3
    };
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], "Missing field: defdef");


    /*
     * check that unrequired fields do not 
     * produce errors.
     */
     
    form_definition.fields[1].required = false;
    errors = validate.validate(form_definition, form_data);
    test.same(errors.length, 0);
    
    
    /*
     * check that nested fields work.
     */
     
    form_definition.fields[0] = {key: "abc.hij", label: "abcabc", required: true};
    form_definition.fields[1] = {key: "def.hij", label: "defdef", required: true};
    form_data = {
        abc: { hij: 1 },
        def: { xyz: 3 }
    }
    errors = validate.validate(form_definition, form_data);
    test.same(errors[0], "Missing field: defdef");
    
    
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
    test.same(errors[0], "Missing field: defdef");
    
     
    test.done();
};