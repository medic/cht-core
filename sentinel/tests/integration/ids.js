var _ = require('underscore'),
  ids = require('../../src/lib/ids'),
  assert = require('chai').assert;

describe('functional ids', () => {
  it('should be suffiently random', () => {
      var TOTAL = 1000,
          MAX_RETRIES = 100;

      var generated = _.map(Array(TOTAL), _.partial(ids._generate, 5));

      var collisions = TOTAL - _.uniq(generated).length;

      assert(
          collisions <= MAX_RETRIES,
          'Should have at most ' + MAX_RETRIES + ' collisions, had: ' + collisions);
  });
});
