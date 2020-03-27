const chai = require('chai');
const validate = require('../../../src/services/report/validate');

describe('records validate', () => {

  /*
   * check that missing fields are logged as errors.
   */
  it('missing fields errors', () => {
    const formDefinition = {
      fields: {
        abc: {type: 'integer', required: true},
        def: {type: 'integer', required: true},
        xyz: {type: 'boolean', required: true}
      }
    };
    const formData = {
      abc: 1,
      hij: 3,
      xyz: false
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors[0]).to.deep.equal({code: 'sys.missing_fields', ctx: { fields: ['def']}});
  });


  it('errors on incorrect data structure', () => {
    const formDefinition = {
      fields: {
        a: {type: 'integer'},
        b: {type: 'string'},
        c: {type: 'boolean'},
        d: {type: 'complex'}
      }
    };
    const formData = {
      a: 'one',
      b: 1,
      c: 'false',
      d: 'really rather simple'
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(4);
    chai.expect(errors).to.deep.equal([
      {code: 'sys.incorrect_type', ctx: { expectedType: 'integer', key: 'a'}},
      {code: 'sys.incorrect_type', ctx: { expectedType: 'string', key: 'b'}},
      {code: 'sys.incorrect_type', ctx: { expectedType: 'boolean', key: 'c'}},
      {code: 'sys.incorrect_type', ctx: { expectedType: 'complex', key: 'd'}},
    ]);
  });

  it('does not error on correct data structures', () => {
    const formDefinition = {
      fields: {
        a: {type: 'integer'},
        b: {type: 'string'},
        c: {type: 'boolean'},
        d: {type: 'complex'}
      }
    };
    const formData = {
      a: 1,
      b: 'bee',
      c: false,
      d: {
        complex: 'stuff'
      }
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(0);
  });

  it('ignores data types that use list mapping', () => {
    const formDefinition = {
      fields: {
        a: {type: 'integer', list: [[1, {en: 'foo'}]]},
      }
    };
    const formData = {
      a: 'foo',
    };
    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(0);
  });

  /*
   * check that unrequired fields do not produce errors.
   */
  it('validate not required', () => {
    const formDefinition = {
      fields: {
        abc: {type: 'integer', required: true},
        def: {type: 'integer', required: false}
      }
    };
    const formData = {
      abc: 1
    };

    const errors = validate.validate(formDefinition, formData);
    chai.expect(errors.length).to.equal(0);
  });
});
