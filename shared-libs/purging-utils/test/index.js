const chai = require('chai');
const utils = require('../src/index');

describe('Purging Utils', () => {
  describe('getRoleHash', () => {
    it('should return unique hash for roles array', () => {
      const hash = utils.getRoleHash([1, 2, 3]);
      const hash2 = utils.getRoleHash([2, 3, 4]);
      const hash3 = utils.getRoleHash([4, 2, 1, 3]);
      chai.expect(hash.length).to.equal(32);
      chai.expect(hash2.length).to.equal(32);
      chai.expect(hash3.length).to.equal(32);

      chai.expect(hash).not.to.equal(hash2);
      chai.expect(hash).not.to.equal(hash3);

      chai.expect(utils.getRoleHash([3, 2, 1])).to.equal(hash);
      chai.expect(utils.getRoleHash([1, 3, 2, 1, 1])).to.equal(hash);
      chai.expect(utils.getRoleHash([3, 3, 4, 4, 2])).to.equal(hash2);
      chai.expect(utils.getRoleHash([3, 2, 1, 4])).to.equal(hash3);
      chai.expect(utils.getRoleHash([1, 2])).not.to.equal(hash);
    });
  });

  describe('getPurgeDbName', () => {
    it('should return correct name', () => {
      chai.expect(utils.getPurgeDbName('a', 'b')).to.equal('a-purged-role-b');
    });
  });

  describe('getPurgedId', () => {
    it('should return correct id', () => {
      chai.expect(utils.getPurgedId('string')).to.equal('purged:string');
      chai.expect(utils.getPurgedId('')).to.equal('');
      chai.expect(utils.getPurgedId()).to.equal(undefined);
    });
  });

  describe('extractId', () => {
    it('should return correct id', () => {
      chai.expect(utils.extractId()).to.equal(undefined);
      chai.expect(utils.extractId(23)).to.equal('23');
      chai.expect(utils.extractId('random')).to.equal('random');
      chai.expect(utils.extractId('purged:123')).to.equal('123');
      chai.expect(utils.extractId('purged:123:purged')).to.equal('123:purged');
      chai.expect(utils.extractId('purged:my-uuid:purged:purged:')).to.equal('my-uuid:purged:purged:');
    });
  });

  describe('sortedUniqueRoles', () => {
    it('should return a sorted unique array', () => {
      chai.expect(utils.sortedUniqueRoles([])).to.deep.equal([]);
      chai.expect(utils.sortedUniqueRoles(['b', 'c', 'a'])).to.deep.equal(['a', 'b', 'c']);
      chai.expect(utils.sortedUniqueRoles(['b', 'c', 'a', 'c', 'a', 'b', 'a'])).to.deep.equal(['a', 'b', 'c']);
    });
  });
});
