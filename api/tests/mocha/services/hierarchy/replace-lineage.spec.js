const { expect } = require('chai');
const {
  replaceParentLineage,
  replaceContactLineage,
} = require('../../../../src/services/hierarchy/replace-lineage');

describe('hierarchy/replace-lineage', () => {
  const newHierarchy = { _id: 'new-parent', parent: { _id: 'new-grandparent' } };

  describe('replaceParentLineage', () => {
    it('replaces the entire parent lineage when no startingFromId is given', () => {
      const doc = { _id: 'doc', parent: { _id: 'old-parent', parent: { _id: 'old-grandparent' } } };

      const changed = replaceParentLineage(doc, { replaceWith: newHierarchy });

      expect(changed).to.equal(true);
      expect(doc.parent).to.deep.equal(newHierarchy);
    });

    it('replaces the lineage after the matching ancestor (move variant)', () => {
      const doc = {
        _id: 'doc',
        parent: { _id: 'child', parent: { _id: 'source', parent: { _id: 'old-grandparent' } } },
      };

      const changed = replaceParentLineage(doc, { startingFromId: 'source', replaceWith: newHierarchy });

      expect(changed).to.equal(true);
      // 'source' is preserved; everything above it is replaced.
      expect(doc.parent.parent._id).to.equal('source');
      expect(doc.parent.parent.parent).to.deep.equal(newHierarchy);
    });

    it('returns false when startingFromId is not present in the lineage', () => {
      const doc = { _id: 'doc', parent: { _id: 'old-parent', parent: { _id: 'old-grandparent' } } };

      const changed = replaceParentLineage(doc, { startingFromId: 'absent', replaceWith: newHierarchy });

      expect(changed).to.equal(false);
      expect(doc.parent).to.deep.equal({ _id: 'old-parent', parent: { _id: 'old-grandparent' } });
    });

    it('clears the lineage when replaceWith is falsy', () => {
      const doc = { _id: 'doc', parent: { _id: 'old-parent' } };

      const changed = replaceParentLineage(doc, { replaceWith: undefined });

      expect(changed).to.equal(true);
      expect(doc.parent).to.equal(undefined);
    });
  });

  describe('replaceContactLineage', () => {
    it('replaces the entire contact lineage when no startingFromId is given', () => {
      const doc = { _id: 'place', contact: { _id: 'old-contact', parent: { _id: 'old-parent' } } };

      const changed = replaceContactLineage(doc, { replaceWith: newHierarchy });

      expect(changed).to.equal(true);
      expect(doc.contact).to.deep.equal(newHierarchy);
    });

    it('replaces the lineage starting from the matching id in merge mode', () => {
      const doc = { _id: 'place', contact: { _id: 'source', parent: { _id: 'old-parent' } } };

      const changed = replaceContactLineage(doc, {
        startingFromId: 'source',
        replaceWith: newHierarchy,
        merge: true,
      });

      expect(changed).to.equal(true);
      // In merge mode the matching id itself is replaced.
      expect(doc.contact).to.deep.equal(newHierarchy);
    });
  });
});
