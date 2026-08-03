const { expect } = require('chai');
const {
  createLineageFromDoc,
  pluckIdsFromLineage,
  replaceParentLineage,
  replaceContactLineage,
} = require('../../../../src/services/hierarchy/lineage-manipulation');

describe('hierarchy/lineage-manipulation', () => {
  describe('createLineageFromDoc', () => {
    it('returns undefined for a falsy doc', () => {
      expect(createLineageFromDoc(undefined)).to.equal(undefined);
      expect(createLineageFromDoc(null)).to.equal(undefined);
    });

    it('builds a lineage stub carrying the id and the existing parent chain', () => {
      const doc = { _id: 'destination', parent: { _id: 'district', parent: { _id: 'root' } }, name: 'Dest' };

      const lineage = createLineageFromDoc(doc);

      expect(lineage).to.deep.equal({
        _id: 'destination',
        parent: { _id: 'district', parent: { _id: 'root' } },
      });
      // Does not carry over unrelated fields such as name.
      expect(lineage).to.not.have.property('name');
    });

    it('leaves parent undefined for a top-level doc', () => {
      const lineage = createLineageFromDoc({ _id: 'top' });

      expect(lineage).to.deep.equal({ _id: 'top', parent: undefined });
    });
  });

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
