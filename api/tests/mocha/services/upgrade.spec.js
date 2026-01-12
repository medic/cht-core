const { expect } = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/setup/upgrade');
const upgradeUtils = require('../../../src/services/setup/utils');

describe('Upgrade service', () => {
  afterEach(() => sinon.restore());

  describe('compareBuildVersions', () => {
    const db = { name: 'medic' };
    const buildMap = (localDdocs, remoteDdocs) => {
      const local = new Map();
      const remote = new Map();
      local.set(db, localDdocs);
      remote.set(db, remoteDdocs);
      return { local, remote };
    };

    const ddoc = (id, { views, nouveau } = {}) => ({ _id: id, views, nouveau });

    it('should report add when remote has a new ddoc', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a'),
      ], [
        ddoc('_design/a'),
        ddoc('_design/b'),
      ]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'add', ddoc: '_design/b', db: 'medic' }]);
    });

    it('should report remove when local has a ddoc missing remotely', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a'),
        ddoc('_design/b'),
      ], [
        ddoc('_design/a'),
      ]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'remove', ddoc: '_design/b', db: 'medic' }]);
    });

    it('should report changed_views when view map differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { views: { v1: { map: 'emit(doc._id)' } } }),
      ], [
        ddoc('_design/a', { views: { v1: { map: 'emit(doc.type)' } } }),
      ]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_views', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when nouveau differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'field2', field_analyzers: { field1: 'std' } } } }),
      ]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should return empty when no differences', async () => {
      const { local, remote } = buildMap(
        [ ddoc(
          '_design/a',
          { views: { v1: { map: 'emit(doc._id)' } },
            nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } } }
        )],
        [ ddoc(
          '_design/a',
          { views: { v1: { map: 'emit(doc._id)' } },
            nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } } }
        )]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should handle multiple databases and include db name in results', async () => {
      const db1 = { name: 'medic' };
      const db2 = { name: 'medic-logs' };

      const local = new Map();
      const remote = new Map();

      // DB1: remote has extra ddoc -> add
      local.set(db1, [
        ddoc('_design/a'),
      ]);
      remote.set(db1, [
        ddoc('_design/a'),
        ddoc('_design/b'),
      ]);

      // DB2: view changed -> changed_views
      local.set(db2, [
        ddoc('_design/x', { views: { v1: { map: 'emit(doc._id)' } } }),
      ]);
      remote.set(db2, [
        ddoc('_design/x', { views: { v1: { map: 'emit(doc.type)' } } }),
      ]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await service.compareBuildVersions({});
      expect(result).to.have.deep.members([
        { type: 'add', ddoc: '_design/b', db: 'medic' },
        { type: 'changed_views', ddoc: '_design/x', db: 'medic-logs' },
      ]);
      expect(result).to.have.length(2);
    });
  });
});
