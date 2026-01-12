const { expect } = require('chai');
const sinon = require('sinon');

const service = require('../../../src/services/setup/upgrade');
const upgradeUtils = require('../../../src/services/setup/utils');
const upgradeSteps = require('../../../src/services/setup/upgrade-steps');
const upgradeLog = require('../../../src/services/setup/upgrade-log');
const viewIndexerProgress = require('../../../src/services/setup/view-indexer-progress');

describe('Upgrade service', () => {
  afterEach(() => sinon.restore());

  describe('upgrade', () => {
    it('should call prep and safeInstall', async () => {
      const buildInfo = { version: '1.0.0' };
      const username = 'admin';
      const stageOnly = false;
      const prepStub = sinon.stub(upgradeSteps, 'prep').resolves();
      const stageStub = sinon.stub(upgradeSteps, 'stage').resolves();
      const indexStub = sinon.stub(upgradeSteps, 'indexStagedViews').resolves();
      const completeStub = sinon.stub(upgradeSteps, 'complete').resolves();
      const finalizeStub = sinon.stub(upgradeSteps, 'finalize').resolves();

      await service.upgrade(buildInfo, username, stageOnly);

      expect(prepStub.calledOnceWith(buildInfo, username, stageOnly)).to.equal(true);
      
      // safeInstall is purposefully called without await
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(stageStub.calledOnceWith(buildInfo)).to.equal(true);
      expect(indexStub.calledOnce).to.equal(true);
      expect(completeStub.calledOnceWith(buildInfo)).to.equal(true);
      expect(finalizeStub.calledOnce).to.equal(true);
    });

    it('should set errored on prep failure', async () => {
      const buildInfo = { version: '1.0.0' };
      const error = new Error('prep failed');
      sinon.stub(upgradeSteps, 'prep').rejects(error);
      const setErroredStub = sinon.stub(upgradeLog, 'setErrored').resolves();

      try {
        await service.upgrade(buildInfo, 'admin', false);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.equal(error);
        expect(setErroredStub.calledOnce).to.equal(true);
      }
    });

    it('should set errored on safeInstall failure', async () => {
      const buildInfo = { version: '1.0.0' };
      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').rejects(new Error('stage failed'));
      const setErroredStub = sinon.stub(upgradeLog, 'setErrored').resolves();

      await service.upgrade(buildInfo, 'admin', false);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(setErroredStub.calledOnce).to.equal(true);
    });

    it('should not call complete if stageOnly is true', async () => {
      const buildInfo = { version: '1.0.0' };
      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      sinon.stub(upgradeSteps, 'indexStagedViews').resolves();
      sinon.stub(upgradeSteps, 'complete');

      await service.upgrade(buildInfo, 'admin', true);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(upgradeSteps.complete.called).to.equal(false);
    });
  });

  describe('complete', () => {
    it('should call upgradeSteps.complete and finalize', async () => {
      const buildInfo = { version: '1.0.0' };
      sinon.stub(upgradeSteps, 'complete').resolves('success');
      sinon.stub(upgradeSteps, 'finalize').resolves();

      const result = await service.complete(buildInfo);

      expect(result).to.equal('success');
      expect(upgradeSteps.complete.calledOnceWith(buildInfo)).to.equal(true);
      expect(upgradeSteps.finalize.calledOnce).to.equal(true);
    });

    it('should set errored on failure', async () => {
      const buildInfo = { version: '1.0.0' };
      const error = new Error('complete failed');
      sinon.stub(upgradeSteps, 'complete').rejects(error);
      sinon.stub(upgradeLog, 'setErrored').resolves();

      try {
        await service.complete(buildInfo);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.equal(error);
        expect(upgradeLog.setErrored.calledOnce).to.equal(true);
      }
    });
  });

  describe('abort', () => {
    it('should call upgradeSteps.abort', async () => {
      sinon.stub(upgradeSteps, 'abort').resolves('aborted');
      const result = await service.abort();
      expect(result).to.equal('aborted');
      expect(upgradeSteps.abort.calledOnce).to.equal(true);
    });
  });

  describe('indexerProgress', () => {
    it('should call viewIndexerProgress.query', () => {
      sinon.stub(viewIndexerProgress, 'query').returns('progress');
      const result = service.indexerProgress();
      expect(result).to.equal('progress');
      expect(viewIndexerProgress.query.calledOnce).to.equal(true);
    });
  });

  describe('upgradeInProgress', () => {
    it('should call upgradeLog.get', () => {
      sinon.stub(upgradeLog, 'get').returns('log');
      const result = service.upgradeInProgress();
      expect(result).to.equal('log');
      expect(upgradeLog.get.calledOnce).to.equal(true);
    });
  });

  describe('canUpgrade', () => {
    it('should call upgradeUtils.isDockerUpgradeServiceRunning', () => {
      sinon.stub(upgradeUtils, 'isDockerUpgradeServiceRunning').returns(true);
      const result = service.canUpgrade();
      expect(result).to.equal(true);
      expect(upgradeUtils.isDockerUpgradeServiceRunning.calledOnce).to.equal(true);
    });
  });

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

    it('should report changed_views when local has views and remote does not', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { views: { v1: { map: 'emit(doc._id)' } } }),
      ], [
        ddoc('_design/a'),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_views', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_views when remote has views and local does not', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a'),
      ], [
        ddoc('_design/a', { views: { v1: { map: 'emit(doc._id)' } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_views', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_views when view count differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { views: { v1: { map: 'emit(doc._id)' } } }),
      ], [
        ddoc('_design/a', { views: { v1: { map: 'emit(doc._id)' }, v2: { map: 'emit(1)' } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_views', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when local has indexes and remote does not', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: {} } }),
      ], [
        ddoc('_design/a'),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when remote has indexes and local does not', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a'),
      ], [
        ddoc('_design/a', { nouveau: { idx1: {} } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when index count differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1' } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1' }, idx2: {} } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when field_analyzers differ in value', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'simple' } } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when field_analyzers differ in length', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std', f2: 'std' } } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when field_analyzers is missing in one ddoc', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1' } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should return empty when both ddocs have no views or indexes', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a'),
      ], [
        ddoc('_design/a'),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should handle null field_analyzers', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: null } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report no changes when multiple views and indexes match perfectly', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', {
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          },
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' },
          }
        }),
      ], [
        ddoc('_design/a', {
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          },
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' },
          }
        }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should report changed_views when one of multiple views differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', {
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          }
        }),
      ], [
        ddoc('_design/a', {
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(3)' },
          }
        }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_views', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should report changed_indexes when one of multiple indexes differs', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', {
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' },
          }
        }),
      ], [
        ddoc('_design/a', {
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f3' },
          }
        }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: 'changed_indexes', ddoc: '_design/a', db: 'medic' }]);
    });

    it('should handle undefined field_analyzers', async () => {
      const { local, remote } = buildMap([
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: null } } }),
      ], [
        ddoc('_design/a', { nouveau: { idx1: { index: 'f1', field_analyzers: undefined } } }),
      ]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await service.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should return empty when there are no differences', async () => {
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
