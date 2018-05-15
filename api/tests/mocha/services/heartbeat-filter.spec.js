const assert = require('chai').assert;

const heartbeatFilter = require('../../../src/services/heartbeat-filter');

const GOOD_INPUTS = [
  5000, 10000, 30000, 60000, 120000
];

const BAD_INPUTS = [
  true, -1, 0, 1, 4999, 'something random'
];

describe('heartbeat-filter', function() {

  GOOD_INPUTS.forEach(goodInput => {
    it(`should return ${goodInput} for '${goodInput}'`, function() {
      // given
      const stringInput = goodInput.toString();
      const expectedOutput = goodInput;

      // expect
      assert.equal(heartbeatFilter(stringInput), expectedOutput);
    });
  });

  BAD_INPUTS.forEach(badInput => {
    it(`should return 60s (couchdb's default) for '${badInput}'`, function() {
      // given
      const stringInput = badInput.toString();

      // expect
      assert.equal(heartbeatFilter(stringInput), 60000);
    });
  });

});
