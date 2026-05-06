const sinon = require('sinon');
const rewire = require('rewire');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;

const { PermissionError } = require('../../../src/errors');
const auth = require('../../../src/auth');

describe('muted-parent service', () => {
  let mutedParent;
  let lineage;
  let revertLineage;

  beforeEach(() => {
    mutedParent = rewire('../../../src/services/muted-parent');
    lineage = { fetchHydratedDoc: sinon.stub() };
    revertLineage = mutedParent.__set__('lineage', lineage);
  });

  afterEach(() => {
    sinon.restore();
    revertLineage();
  });

  describe('isParentMuted', () => {
    it('returns false when no parent ref', async () => {
      expect(await mutedParent.isParentMuted()).to.equal(false);
      expect(lineage.fetchHydratedDoc.notCalled).to.be.true;
    });

    it('returns false when parent doc is not found', async () => {
      lineage.fetchHydratedDoc.resolves(null);
      expect(await mutedParent.isParentMuted('p1')).to.equal(false);
    });

    it('returns true when the immediate parent is muted', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      expect(await mutedParent.isParentMuted('p1')).to.equal(true);
    });

    it('returns true when an ancestor is muted', async () => {
      lineage.fetchHydratedDoc.resolves({
        _id: 'p1',
        parent: { _id: 'g1', muted: '2025-01-01T00:00:00Z' },
      });
      expect(await mutedParent.isParentMuted('p1')).to.equal(true);
    });

    it('returns false when nothing in lineage is muted', async () => {
      lineage.fetchHydratedDoc.resolves({
        _id: 'p1',
        parent: { _id: 'g1', parent: { _id: 'gg1' } },
      });
      expect(await mutedParent.isParentMuted('p1')).to.equal(false);
    });

    it('accepts an inline parent object with _id', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      expect(await mutedParent.isParentMuted({ _id: 'p1' })).to.equal(true);
      expect(lineage.fetchHydratedDoc.calledOnceWithExactly('p1')).to.be.true;
    });
  });

  describe('assertCanCreateOnMutedParent', () => {
    let hasAllPermissions;

    beforeEach(() => {
      hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
    });

    it('resolves silently when parent is not muted', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1' });
      await expect(mutedParent.assertCanCreateOnMutedParent({}, 'p1'))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.notCalled).to.be.true;
    });

    it('resolves silently when no parent ref', async () => {
      await expect(mutedParent.assertCanCreateOnMutedParent({}, null))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.notCalled).to.be.true;
    });

    it('resolves when parent is muted but user has the permission', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      hasAllPermissions.returns(true);
      await expect(mutedParent.assertCanCreateOnMutedParent({ roles: ['chw'] }, 'p1'))
        .to.eventually.be.fulfilled;
      expect(hasAllPermissions.calledOnceWithExactly(
        { roles: ['chw'] }, 'can_create_contacts_under_muted_places'
      )).to.be.true;
    });

    it('throws PermissionError when parent is muted and user lacks the permission', async () => {
      lineage.fetchHydratedDoc.resolves({ _id: 'p1', muted: '2025-01-01T00:00:00Z' });
      hasAllPermissions.returns(false);
      await expect(mutedParent.assertCanCreateOnMutedParent({ roles: ['chw'] }, 'p1'))
        .to.be.rejectedWith(PermissionError, 'Insufficient privileges to create contacts on muted places');
    });
  });
});
