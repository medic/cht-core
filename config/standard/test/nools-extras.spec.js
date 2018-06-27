const assert = require('chai').assert;
const parse = require('medic-conf/src/lib/simple-js-parser');

describe('contact-utils', function() {
  const cu = parse({
    jsFiles: [ 'nools-extras.js' ],
    export: [
      'getMostRecentReport',
    ],
    header: `var Utils = {
      now: function() { return 1527158024122; },
    };`,
  });

  describe('#getMostRecentReport()', function() {
    it('exists', function() {
      assert.equal(typeof cu.getMostRecentReport, 'function');
    });
  });
});
