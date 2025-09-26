const expect = require('chai').expect;

const lib = require('../src/index');

describe('nouveau utils', () => {
  it('should return limits', () => {
    expect(lib.BATCH_LIMIT).to.equal(1000);
    expect(lib.RESULTS_LIMIT).to.equal(200000);
  });

  describe('escaping special characters', () => {
    [ '+', '-', '&', '|', '!', '^', '"', '~', '*', '?', ':' ].forEach(specialChar => {
      it(`should escape ${specialChar}`, () => {
        expect(lib.escapeKeys(`a${specialChar}string`)).to.equal(`a\\${specialChar}string`);
      });
    });

    it('should escape a uuid', () => {
      expect(lib.escapeKeys('a-uuid-string')).to.equal('a\\-uuid\\-string');
    });

    it('should escape a user name', () => {
      expect(lib.escapeKeys('org.couchdb.user:fixture.user.test'))
        .to.equal('org.couchdb.user\\:fixture.user.test');
    });

    it('should escape a task uuid', () => {
      expect(
        // eslint-disable-next-line @stylistic/max-len
        lib.escapeKeys('task~org.couchdb.user:48_tam~0f335495-cc71-43a5-a3d0-0e1b32d54c8e~commodities-stock-out~cha-commodity-stock-out~1723279828121')
      ).to.equal(
        // eslint-disable-next-line @stylistic/max-len
        'task\\~org.couchdb.user\\:48_tam\\~0f335495\\-cc71\\-43a5\\-a3d0\\-0e1b32d54c8e\\~commodities\\-stock\\-out\\~cha\\-commodity\\-stock\\-out\\~1723279828121'
      );
    });
  });
});
