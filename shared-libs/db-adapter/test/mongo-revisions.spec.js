const { expect } = require('chai');
const revisions = require('../src/mongo/mongo-revisions');

describe('mongo-revisions', () => {
  describe('generateFirstRev', () => {
    it('should generate a rev starting with 1-', () => {
      const rev = revisions.generateFirstRev({ _id: 'doc1', type: 'report' });
      expect(rev).to.match(/^1-[a-f0-9]+$/);
    });

    it('should be deterministic for the same doc', () => {
      const doc = { _id: 'doc1', type: 'report', field: 'value' };
      const rev1 = revisions.generateFirstRev(doc);
      const rev2 = revisions.generateFirstRev(doc);
      expect(rev1).to.equal(rev2);
    });

    it('should differ for different docs', () => {
      const rev1 = revisions.generateFirstRev({ _id: 'doc1', type: 'a' });
      const rev2 = revisions.generateFirstRev({ _id: 'doc2', type: 'b' });
      expect(rev1).to.not.equal(rev2);
    });
  });

  describe('generateNextRev', () => {
    it('should increment the generation number', () => {
      const rev = revisions.generateNextRev('1-abc', { _id: 'doc1' });
      expect(rev).to.match(/^2-[a-f0-9]+$/);
    });

    it('should increment from higher generations', () => {
      const rev = revisions.generateNextRev('5-xyz', { _id: 'doc1' });
      expect(rev).to.match(/^6-[a-f0-9]+$/);
    });
  });

  describe('parseRevGeneration', () => {
    it('should parse generation from rev string', () => {
      expect(revisions.parseRevGeneration('3-abc123')).to.equal(3);
    });

    it('should return 0 for null/undefined', () => {
      expect(revisions.parseRevGeneration(null)).to.equal(0);
      expect(revisions.parseRevGeneration(undefined)).to.equal(0);
    });

    it('should return 0 for invalid rev', () => {
      expect(revisions.parseRevGeneration('invalid')).to.equal(0);
    });
  });
});
