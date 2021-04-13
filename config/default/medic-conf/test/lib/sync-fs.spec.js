const assert = require('chai').assert;

const fs = require('../../src/lib/sync-fs');

describe('sync-fs', () => {

  describe('#withoutExtension()', () => {

    [
      ['person.xml', 'person'],
      ['person.abc.xml', 'person.abc'],
    ].forEach(([input, expected]) => {

      it(`should convert ${input} to ${expected}`, () => {
        assert.equal(fs.withoutExtension(input), expected);
      });
    });
  });
});
