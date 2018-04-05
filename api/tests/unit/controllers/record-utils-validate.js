const validate = require('../../../services/report/validate');

/*
 * check that missing fields are logged as errors.
 */
exports['missing fields errors'] = test => {
  const form_definition = {
    fields: {
      abc: {_key: 'abc', labels: 'abcabc', required: true},
      def: {_key: 'def', labels: 'defdef', required: true}
    }
  };
  const form_data = {
    abc: 1,
    hij: 3
  };
  const errors = validate.validate(form_definition, form_data);
  test.same(errors[0], {code: 'sys.missing_fields', fields: ['def']});
  test.done();
};

/*
 * check that unrequired fields do not produce errors.
 */
exports['validate not required'] = test => {
  const form_definition = {
    fields: {
      abc: {_key: 'abc', labels: 'abcabc', required: true},
      def: {_key: 'def', labels: 'defdef', required: false}
    }
  };
  const form_data = {
    abc: 1
  };
  // not required
  form_definition.fields.def.required = false;
  const errors = validate.validate(form_definition, form_data);
  test.same(errors.length, 0);
  test.done();
};

/*
 * check that nested fields work.
 */
exports['nested fields missing'] = test => {
  const form_definition = {
    fields: {
      'abc.hij': {
        _key: 'abc.hij',
        labels: 'abcabc',
        required: true
      },
      'def.hij': {
        _key: 'def.hij',
        labels: 'defdef',
        required: true
      }
    }
  };
  const form_data = {
    abc: { hij: 1 },
    def: { xyz: 3 }
  };
  const errors = validate.validate(form_definition, form_data);
  test.same(errors[0], {code: 'sys.missing_fields', fields: ['def.hij']});
  test.done();
};

/*
 * check form data with labels.
 */
exports['form data with labels'] = test => {
  const form_definition = {
    fields: {
      'abc.hij': {
        _key: 'abc.hij',
        labels: 'abcabc',
        required: true
      },
      'def.hij': {
        _key: 'def.hij',
        labels: 'defdef',
        required: true
      }
    }
  };
  const form_data = {
    abc: {
      hij: [ '1', 'abcabc' ]
    },
    def: {
      hij: [ null, 'defdef' ]
    }
  };
  const errors = validate.validate(form_definition, form_data);
  test.same(errors[0], {code: 'sys.missing_fields', fields: ['def.hij']});
  test.done();
};

/*
 * Support custom validation function.
 */
exports['custom validations function'] = test => {
  const def = {
    meta: {
      code: 'FOO'
    },
    fields: {
      foo: {
        _key: 'foo',
        required: true
      }
    },
    validations: {
      check1: 'function() { ' +
          '   if (form_data["foo"] !== "3") { return "Arg." } ' +
          '}'
    }
  };
  const data = { foo: 2 };
  const errors = validate.validate(def, data);
  test.same(errors[0], {code:'sys.form_invalid_custom', form:'FOO', message:'Arg.'});
  test.done();
};
