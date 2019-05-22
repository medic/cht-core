const assert = require('chai').assert;

describe('contact-utils', function() {
  const cu = require('../nools-extras');

  describe('#getMostRecentReport()', function() {
    it('exists', function() {
      assert.equal(typeof cu.getMostRecentReport, 'function');
    });
  });
});
