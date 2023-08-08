const _ = require('lodash');
const ids = require('../../src/lib/ids');
const assert = require('chai').assert;

describe('functional ids', () => {
  it('should be suffiently random', () => {
    const TOTAL = 1000;
    const MAX_RETRIES = 100;

    const generated = _.map(Array(TOTAL), _.partial(ids._generate, 5));

    const collisions = TOTAL - _.uniq(generated).length;

    assert(
      collisions <= MAX_RETRIES,
      'Should have at most ' + MAX_RETRIES + ' collisions, had: ' + collisions
    );
  });
});
