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

  describe('lenmin', () => {
    it('should return true when length is greater than min', () => {
      assert.isTrue(validatorFunctions.lenmin(null, 'abcd', 3));
    });
    it('should return true when length equals min', () => {
      assert.isTrue(validatorFunctions.lenmin(null, 'abc', 3));
    });
    it('should return false when length is less than min', () => {
      assert.isFalse(validatorFunctions.lenmin(null, 'ab', 3));
    });
  });

  describe('lenmax', () => {
    it('should return true when length is less than max', () => {
      assert.isTrue(validatorFunctions.lenmax(null, 'ab', 3));
    });
    it('should return true when length equals max', () => {
      assert.isTrue(validatorFunctions.lenmax(null, 'abc', 3));
    });
    it('should return false when length exceeds max', () => {
      assert.isFalse(validatorFunctions.lenmax(null, 'abcd', 3));
    });
  });

  describe('lenequals', () => {
    it('should return true when length matches', () => {
      assert.isTrue(validatorFunctions.lenequals(null, 'abc', '3'));
    });
    it('should return false when length does not match', () => {
      assert.isFalse(validatorFunctions.lenequals(null, 'abcd', '3'));
    });
  });

  describe('min', () => {
    it('should return true when value is greater than min', () => {
      assert.isTrue(validatorFunctions.min(null, '10', 5));
    });
    it('should return false when value is less than min', () => {
      assert.isFalse(validatorFunctions.min(null, '3', 5));
    });
  });

  describe('max', () => {
    it('should return true when value is less than max', () => {
      assert.isTrue(validatorFunctions.max(null, '3', 5));
    });
    it('should return false when value exceeds max', () => {
      assert.isFalse(validatorFunctions.max(null, '10', 5));
    });
  });

  describe('between', () => {
    it('should return true when value is between min and max', () => {
      assert.isTrue(validatorFunctions.between(null, '5', 1, 10));
    });
    it('should return true when value equals min', () => {
      assert.isTrue(validatorFunctions.between(null, '1', 1, 10));
    });
    it('should return false when value is outside range', () => {
      assert.isFalse(validatorFunctions.between(null, '11', 1, 10));
    });
  });

  describe('required', () => {
    it('should return true for truthy value', () => {
      assert.isTrue(validatorFunctions.required(null, 'hello'));
    });
    it('should return false for empty string', () => {
      assert.isFalse(validatorFunctions.required(null, ''));
    });
    it('should return false for null', () => {
      assert.isFalse(validatorFunctions.required(null, null));
    });
  });

  describe('optional', () => {
    it('should always return true', () => {
      assert.isTrue(validatorFunctions.optional());
    });
  });

  describe('numeric', () => {
    it('should return true for numeric string', () => {
      assert.isTrue(validatorFunctions.numeric(null, '123'));
    });
    it('should return true for float', () => {
      assert.isTrue(validatorFunctions.numeric(null, '1.5'));
    });
    it('should return false for non-numeric string', () => {
      assert.isFalse(validatorFunctions.numeric(null, 'abc'));
    });
  });

  describe('alpha', () => {
    it('should return true for alpha string', () => {
      assert.isTrue(validatorFunctions.alpha(null, 'abc'));
    });
    it('should return false for string with numbers', () => {
      assert.isFalse(validatorFunctions.alpha(null, 'abc123'));
    });
  });

  describe('alphanumeric', () => {
    it('should return true for alphanumeric string', () => {
      assert.isTrue(validatorFunctions.alphanumeric(null, 'abc123'));
    });
    it('should return false for string with special chars', () => {
      assert.isFalse(validatorFunctions.alphanumeric(null, 'abc@123'));
    });
  });

  describe('email', () => {
    it('should return true for valid email', () => {
      assert.isTrue(validatorFunctions.email(null, 'test@example.com'));
    });
    it('should return false for invalid email', () => {
      assert.isFalse(validatorFunctions.email(null, 'not-an-email'));
    });
  });

  describe('regex', () => {
    it('should return true when value matches regex', () => {
      assert.isTrue(validatorFunctions.regex(null, '123', '^\\d+$'));
    });
    it('should return false when value does not match regex', () => {
      assert.isFalse(validatorFunctions.regex(null, 'abc', '^\\d+$'));
    });
    it('should support flags', () => {
      assert.isTrue(validatorFunctions.regex(null, 'ABC', '^abc$', 'i'));
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
