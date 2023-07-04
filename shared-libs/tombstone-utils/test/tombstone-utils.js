const lib = require('../src/tombstone-utils');
const expect = require('chai').expect;

describe('Tombstone Utils Lib', function() {
  'use strict';

  describe('isTombstoneId', () => {
    it('returns true for strings that match, false otherwise', () => {
      expect(lib.isTombstoneId('aaaa')).to.equal(false);
      expect(lib.isTombstoneId('doc____rev____tombstone')).to.equal(true);
      expect(lib.isTombstoneId('doc-rev-tombstone')).to.equal(false);
    });
  });
});
