const should = require('chai').should();

describe('utils util', () => {
  const utils = require('../../../src/lib/utils');
  describe('getClinicPhone', () => {
    it('gets the phone number of the clinic', () => {
      const phone = '123';
      const doc = {
        contact: {
          parent: {
            type: 'clinic',
            contact: { phone: phone }
          }
        }
      };

      utils.getClinicPhone(doc).should.equal(phone);
    });
    it('gets the contact phone number if there is no clinic', () => {
      const phone = '123';
      const doc = {
        contact: {
          phone: phone
        }
      };

      utils.getClinicPhone(doc).should.equal(phone);
    });
  });
  it('getHealthCenterPhone works', () => {
      const phone = '123';
      const doc = {
        contact: {
          parent: {
            type: 'health_center',
            contact: {
              phone: phone
            }
          }
        }
      };

      utils.getHealthCenterPhone(doc).should.equal(phone);
  });
  it('getDistrictPhone works', () => {
    const phone = '123';
    const doc = {
      contact: {
        parent: {
          type: 'district_hospital',
          contact: {
            phone: phone
          }
        }
      }
    };

    utils.getDistrictPhone(doc).should.equal(phone);
  });
  it('isNonEmptyString works', () => {
    utils.isNonEmptyString().should.equal(false);
    utils.isNonEmptyString('').should.equal(false);
    utils.isNonEmptyString(123).should.equal(false);
    utils.isNonEmptyString(['hello']).should.equal(false);
    utils.isNonEmptyString('foo.bar').should.equal(true);
  });
  describe('evalExpression', () => {
    it('evals a given expression', () => {
      utils.evalExpression('(1+2+3) !== 24', {}).should.equal(true);
      utils.evalExpression('(1+2+3) === 24', {}).should.equal(false);
    });
    it('provides the passed context to the exprssion', () => {
      utils.evalExpression('doc.foo + doc.bar', {doc: {foo: 42, bar: 24}})
        .should.equal(66);
    });
    it('throws an exception if the expression errors', () => {
      should.Throw(() => utils.evalExpression(`doc.foo.bar.smang === 'cats'`, {}));
    });
  });
});
