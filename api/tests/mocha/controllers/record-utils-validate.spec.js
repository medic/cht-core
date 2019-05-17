const chai = require('chai'),
      validate = require('../../../src/services/report/validate');

describe('record-utils-validate', () => {

  /*
   * check that missing fields are logged as errors.
   */
  it('missing fields errors', () => {
    const formDefinition = {
      fields: {
        abc: {_key: 'abc', type: 'number', labels: 'abcabc', required: true},
        def: {_key: 'def', type: 'number', labels: 'defdef', required: true}
      }
    };
    const formData = {
      abc: 1,
      hij: 3
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors[0]).to.deep.equal({code: 'sys.missing_fields', fields: ['def']});
  });


  it('errors on incorrect data structure');

  /*
   * check that unrequired fields do not produce errors.
   */
  it('validate not required', () => {
    const formDefinition = {
      fields: {
        abc: {_key: 'abc', type: 'number', labels: 'abcabc', required: true},
        def: {_key: 'def', type: 'number', labels: 'defdef', required: false}
      }
    };
    const formData = {
      abc: 1
    };
    // not required
    formDefinition.fields.def.required = false;
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(0);
  });

  /*
   * check form data with labels.
   */
  it('form data with labels', () => {
    const formDefinition = {
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
    const formData = {
      abc: {
        hij: [ '1', 'abcabc' ]
      },
      def: {
        hij: [ null, 'defdef' ]
      }
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors[0]).to.deep.equal({code: 'sys.missing_fields', fields: ['def.hij']});
  });
});
