const sinon = require('sinon');
const rewire = require('rewire');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;

const { PermissionError } = require('../../../src/errors');
const auth = require('../../../src/auth');
const config = require('../../../src/config');

describe('muted-parent service', () => {
  let mutedParent;
  let lineage;
  let revertLineage;

  beforeEach(() => {
    mutedParent = rewire('../../../src/services/muted-parent');
    lineage = { fetchHydratedDoc: sinon.stub() };
    revertLineage = mutedParent.__set__('lineage', lineage);
    sinon.stub(config, 'getTransitionsLib').returns({
      // stand in for muting_utils.isMutedInLineage: ancestors only, never the doc itself
      isMutedInLineage: (doc) => {
        let parent = doc?.parent;
        while (parent) {
          if (parent.muted) {
            return parent._id;
          }
          parent = parent.parent;
        }
        return false;
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    revertLineage();
  });

  describe('isParentMuted', () => {
    it('returns false when no parent ref', async () => {
      expect(await mutedParent.isParentMuted()).to.be.false;
      expect(lineage.fetchHydratedDoc.notCalled).to.be.true;
    });

    it('returns false when the hydrated parent is falsy', async () => {
      lineage.fetchHydratedDoc.resolves(null);
      expect(await mutedParent.isParentMuted('p1')).to.be.false;
    });

    it('returns false when fetchHydratedDoc throws a 404 (defers to underlying handler)', async () => {
      const notFound = Object.assign(new Error('Document not found: p1'), { status: 404 });
      lineage.fetchHydratedDoc.rejects(notFound);
      expect(await mutedParent.isParentMuted('p1')).to.be.false;
    });

    it('returns false when fetchHydratedDoc throws with code 404 (throwWhenMissingLineage shape)', async () => {
      const notFound = Object.assign(new Error('Document not found: p1'), { code: 404 });
      lineage.fetchHydratedDoc.rejects(notFound);
      expect(await mutedParent.isParentMuted('p1')).to.be.false;
    });

    it('rethrows non-404 errors from fetchHydratedDoc', async () => {
      const boom = Object.assign(new Error('boom'), { status: 500 });
      lineage.fetchHydratedDoc.rejects(boom);
      await expect(mutedParent.isParentMuted('p1')).to.be.rejectedWith(boom);
    });

    it('returns true when the immediate parent is muted', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      expect(await mutedParent.isParentMuted('p1')).to.be.true;
    });

    it('returns true when an ancestor is muted', async () => {
      lineage.fetchHydratedDoc.resolves({
        _id: 'p1',
        parent: { _id: 'g1', muted: '2025-01-01T00:00:00Z' },
      });
      expect(await mutedParent.isParentMuted('p1')).to.be.true;
    });

    it('returns false when nothing in lineage is muted', async () => {
      lineage.fetchHydratedDoc.resolves({
        _id: 'p1',
        parent: { _id: 'g1', parent: { _id: 'gg1' } },
      });
      expect(await mutedParent.isParentMuted('p1')).to.be.false;
    });

    it('accepts an inline parent object with _id', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      expect(await mutedParent.isParentMuted({ _id: 'p1' })).to.be.true;
      expect(lineage.fetchHydratedDoc.calledOnceWithExactly('p1')).to.be.true;
    });

    it('ignores a parent object whose _id is not a string', async () => {
      for (const badId of [123, true, ['p1'], { _id: 'p1' }]) {
        expect(await mutedParent.isParentMuted({ _id: badId })).to.be.false;
      }
      expect(lineage.fetchHydratedDoc.notCalled).to.be.true;
    });

    it('does not inspect an inline parent object without _id, even when its own parent is a muted uuid', async () => {
      const inlineParent = { name: 'new clinic', type: 'clinic', parent: 'muted-uuid' };
      expect(await mutedParent.isParentMuted(inlineParent)).to.be.false;
      expect(lineage.fetchHydratedDoc.notCalled).to.be.true;
    });
  });

  describe('assertCanCreateOnMutedParent', () => {
    let hasAllPermissions;

    beforeEach(() => {
      hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
    });

    it('checks the permission then loads the lineage when parent is not muted and user lacks it', async () => {
      hasAllPermissions.returns(false);
      lineage.fetchHydratedDoc.resolves({ _id: 'p1' });
      await expect(mutedParent.assertCanCreateOnMutedParent({ roles: ['chw'] }, 'p1'))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.calledOnce).to.be.true;
      expect(lineage.fetchHydratedDoc.calledOnce).to.be.true;
      expect(hasAllPermissions.calledBefore(lineage.fetchHydratedDoc)).to.be.true;
    });

    it('resolves silently when no parent ref', async () => {
      await expect(mutedParent.assertCanCreateOnMutedParent({}, null))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.notCalled).to.be.true;
    });

    // Permission holders are allowed on a muted parent, and the check short circuits before the
    // lineage load, so the parent's muted state is never consulted for them.
    it('resolves without loading the parent at all when the user has the permission', async () => {
      hasAllPermissions.returns(true);
      await expect(mutedParent.assertCanCreateOnMutedParent({ roles: ['chw'] }, 'p1'))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.calledOnceWithExactly(
        { roles: ['chw'] }, 'can_create_contacts_under_muted_places'
      )).to.be.true;
      expect(lineage.fetchHydratedDoc.notCalled).to.be.true;
    });

    it('throws PermissionError when parent is muted and user lacks the permission', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      hasAllPermissions.returns(false);
      await expect(mutedParent.assertCanCreateOnMutedParent({ roles: ['chw'] }, 'p1'))
        .to.be.rejectedWith(PermissionError, 'Insufficient privileges to create contacts on muted places');
    });
  });
});
