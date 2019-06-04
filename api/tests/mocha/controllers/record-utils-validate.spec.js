const chai = require('chai'),
      validate = require('../../../src/services/report/validate');

describe('record-utils-validate', () => {

  /*
   * check that missing fields are logged as errors.
   */
  it('missing fields errors', () => {
    const formDefinition = {
      fields: {
        abc: {type: 'number', labels: 'abcabc', required: true},
        def: {type: 'number', labels: 'defdef', required: true}
      }
    };
    const formData = {
      abc: 1,
      hij: 3
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors[0]).to.deep.equal({code: 'sys.missing_fields', ctx: { fields: ['def']}});
  });


  it('errors on incorrect data structure');

  /*
   * check that unrequired fields do not produce errors.
   */
  it('validate not required', () => {
    const formDefinition = {
      fields: {
        abc: {type: 'number', required: true},
        def: {type: 'number', required: false}
      }
    };
    const formData = {
      abc: 1
    };

    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(0);
  });
});
