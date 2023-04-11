const assert = require('chai').assert;

const getRoles = require('../../../src/libs/types-and-roles');

describe('types-and-roles', function() {

  it('should return an empty list for a blank type', function() {
    assert.deepEqual(getRoles(),     []);
    assert.deepEqual(getRoles(null), []);
    assert.deepEqual(getRoles(''),   []);
  });

  it('should return the type alone for an unmapped type', function() {
    assert.deepEqual(getRoles('unmapped-type'), ['unmapped-type']);
  });

  it('should return the type and other roles for a mapped type', function() {
    assert.deepEqual(getRoles('gateway'), ['gateway', 'kujua_gateway']);
  });

});
