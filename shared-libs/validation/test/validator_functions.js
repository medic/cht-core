const assert = require('chai').assert;
const validatorFunctions = require('../src/validator_functions');

describe('validator functions', () => {

  describe('integer', () => {

    const valid = ['0', '1', '2080', '-2', '   5'];

    valid.forEach(value => {
      it(`should return true for "${value}"`, () => {
        assert.isTrue(validatorFunctions.integer(null, value));
      });
    });

    const invalid = ['', 'a', '56b', '2.3', '-'];

    invalid.forEach(value => {
      it(`should return false for "${value}"`, () => {
        assert.isFalse(validatorFunctions.integer(null, value));
      });
    });
  });

  describe('in', () => {

    it('should return true for value in list', () => {
      assert.isTrue(validatorFunctions.in(null, 'a', 'a', 'b', 'c'));
    });

    it('should return false for value not in list', () => {
      assert.isFalse(validatorFunctions.in(null, 'd', 'a', 'b', 'c'));
    });

  });

  describe('equals', () => {

    it('should return true for equal values same type', () => {
      assert.isTrue(validatorFunctions.equals(null, 'a', 'a'));
    });

    it('should return true for equal values different type', () => {
      assert.isTrue(validatorFunctions.equals(null, '1', 1));
    });

    it('should return false for equal values difference case', () => {
      assert.isFalse(validatorFunctions.equals(null, 'a', 'A'));
    });

    it('should return false for unequal values', () => {
      assert.isFalse(validatorFunctions.equals(null, 'a', 'b'));
    });

  });

  describe('iequals', () => {

    it('should return true for equal values same type', () => {
      assert.isTrue(validatorFunctions.iequals(null, 'a', 'a'));
    });

    it('should return false for equal values difference case', () => {
      assert.isTrue(validatorFunctions.iequals(null, 'a', 'A'));
    });

    it('should return false for unequal values', () => {
      assert.isFalse(validatorFunctions.iequals(null, 'a', 'b'));
    });

  });

  describe('sequals', () => {

    it('should return true for equal values same type', () => {
      assert.isTrue(validatorFunctions.sequals(null, 'a', 'a'));
    });

    it('should return false for equal values different type', () => {
      assert.isFalse(validatorFunctions.sequals(null, '1', 1));
    });

    it('should return false for equal values difference case', () => {
      assert.isFalse(validatorFunctions.sequals(null, 'a', 'A'));
    });

    it('should return false for unequal values', () => {
      assert.isFalse(validatorFunctions.sequals(null, 'a', 'b'));
    });

  });


  describe('siequals', () => {

    it('should return true for equal values same type', () => {
      assert.isTrue(validatorFunctions.siequals(null, 'a', 'a'));
    });

    it('should return true for equal values difference case', () => {
      assert.isTrue(validatorFunctions.siequals(null, 'a', 'A'));
    });

    it('should return false for unequal values', () => {
      assert.isFalse(validatorFunctions.siequals(null, 'a', 'b'));
    });

  });

  describe('equalsto', () => {

    const allValues = {
      name: 'gareth',
      location: 'darmstadt'
    };

    it('should return true for equal values', () => {
      assert.isTrue(validatorFunctions.equalsto(allValues, 'gareth', 'name'));
    });

    it('should return false for unequal values', () => {
      assert.isFalse(validatorFunctions.equalsto(allValues, 'gareth', 'location'));
    });

  });

});
