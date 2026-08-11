const { expect } = require('chai');
const {
  pluckIdsFromLineage,
  replaceParentLineage,
  replaceContactLineage,
} = require('../../../../src/services/hierarchy/lineage-manipulation');

describe('hierarchy/lineage-manipulation', () => {
  describe('pluckIdsFromLineage', () => {
    it('returns an empty array for a falsy lineage', () => {
      expect(pluckIdsFromLineage(undefined)).to.deep.equal([]);
      expect(pluckIdsFromLineage(null)).to.deep.equal([]);
    });

    it('collects ids from the lineage root downwards', () => {
      const lineage = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };

      expect(pluckIdsFromLineage(lineage)).to.deep.equal(['a', 'b', 'c']);
    });

    it('appends to a provided results array', () => {
      const lineage = { _id: 'b', parent: { _id: 'c' } };

      expect(pluckIdsFromLineage(lineage, ['a'])).to.deep.equal(['a', 'b', 'c']);
    });
  });

  describe('re-exported replace-lineage helpers', () => {
    it('re-exports replaceParentLineage and replaceContactLineage', () => {
      expect(replaceParentLineage).to.be.a('function');
      expect(replaceContactLineage).to.be.a('function');
    });
  });
});
