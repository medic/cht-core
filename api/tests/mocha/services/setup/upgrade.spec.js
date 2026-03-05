const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const upgradeSteps = require('../../../../src/services/setup/upgrade-steps');
const upgradeUtils = require('../../../../src/services/setup/utils');
const viewIndexerProgress = require('../../../../src/services/setup/view-indexer-progress');

let upgrade;

describe('upgrade service', () => {
  beforeEach(() => {
    upgrade = rewire('../../../../src/services/setup/upgrade');
    sinon.stub(upgradeUtils, 'getDdocInfo').resolves({ sizes: { file: 0 } });
    sinon.stub(upgradeUtils, 'getNouveauInfo').resolves([]);
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('upgrade', () => {
    it('should call prep and safeInstall', async () => {
      const buildInfo = { version: '1.0.0' };
      const username = 'admin';
      const stageOnly = false;
      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      sinon.stub(upgradeSteps, 'indexStagedViews').resolves();
      sinon.stub(upgradeSteps, 'complete').resolves();
      sinon.stub(upgradeSteps, 'finalize').resolves();

      await upgrade.upgrade(buildInfo, username, stageOnly);

      expect(upgradeSteps.prep.calledOnceWith(buildInfo, username, stageOnly)).to.equal(true);
      
      // safeInstall is purposefully called without await
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(upgradeSteps.stage.calledOnceWith(buildInfo)).to.equal(true);
      expect(upgradeSteps.indexStagedViews.calledOnce).to.equal(true);
      expect(upgradeSteps.complete.calledOnceWith(buildInfo)).to.equal(true);
      expect(upgradeSteps.finalize.calledOnce).to.equal(true);
    });

    it('should prep and not wait for stage or views indexing when only staging', async () => {
      sinon.stub(upgradeSteps, 'prep').resolves();
      let stage;
      sinon.stub(upgradeSteps, 'stage').returns(new Promise(r => stage = r));
      let indexStagedViews;
      sinon.stub(upgradeSteps, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));

      const upgradePromise = upgrade.upgrade('theversion', 'admin', true);

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.prep.args[0]).to.deep.equal(['theversion', 'admin', true]);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.stage.args[0]).to.deep.equal(['theversion']);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;

      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await stage();
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      await indexStagedViews();
    });

    it('should prep and not wait for stage or views indexing when not only staging', async () => {
      sinon.stub(upgradeSteps, 'prep').resolves();
      let stage;
      sinon.stub(upgradeSteps, 'stage').returns(new Promise(r => stage = r));
      let indexStagedViews;
      sinon.stub(upgradeSteps, 'indexStagedViews').returns(new Promise(r => indexStagedViews = r));
      sinon.stub(upgradeSteps, 'complete').resolves();
      sinon.stub(upgradeSteps, 'finalize').resolves();

      const upgradePromise = upgrade.upgrade('a_version', 'usr', false);

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.prep.args[0]).to.deep.equal(['a_version', 'usr', false]);
      expect(upgradeSteps.stage.callCount).to.equal(0);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await Promise.resolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.stage.args[0]).to.deep.equal(['a_version']);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await stage();
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);
      await indexStagedViews();
    });

    it('should throw error when build info is invalid', async () => {
      sinon.stub(upgradeLogService, 'setErrored').resolves();
      try {
        await upgrade.upgrade('something');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.match(/Invalid build info/);
        expect(upgradeLogService.setErrored.callCount).to.equal(1);
      }
    });

    it('should set the upgrade as errored when prep fails', async () => {
      sinon.stub(upgradeSteps, 'prep').rejects({ prep: false });
      sinon.stub(upgradeLogService, 'setErrored').resolves();
      try {
        await upgrade.upgrade('22');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ prep: false });
        expect(upgradeLogService.setErrored.callCount).to.equal(1);
      }
    });

    it('should set the upgrade as errored when staging views fails despite of stage only', async () => {
      sinon.stub(upgradeSteps, 'prep').resolves();
      let stage;
      sinon.stub(upgradeSteps, 'stage').returns(new Promise((res, rej) => stage = rej));
      sinon.stub(upgradeSteps, 'indexStagedViews');
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      const upgradePromise = upgrade.upgrade('v', 'admin', true);

      await Promise.resolve();

      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);

      await upgradePromise;
      expect(upgradeLogService.setErrored.callCount).to.equal(0);

      stage({ code: 'omg' });
      await Promise.resolve();
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(0);
    });

    it('should set the upgrade as errored when indexing views fails despite of stage only', async () => {
      sinon.stub(upgradeSteps, 'prep').resolves();
      sinon.stub(upgradeSteps, 'stage').resolves();
      let indexStagedViews;
      sinon.stub(upgradeSteps, 'indexStagedViews').returns(new Promise((res, rej) => indexStagedViews = rej));
      sinon.stub(upgradeLogService, 'setErrored').resolves();

      const upgradePromise = upgrade.upgrade('aaa', 'admin', true);
      await Promise.resolve(); // prep
      await Promise.resolve(); // stage
      expect(upgradeSteps.prep.callCount).to.equal(1);
      expect(upgradeSteps.stage.callCount).to.equal(1);
      expect(upgradeSteps.indexStagedViews.callCount).to.equal(1);

      await upgradePromise;
      expect(upgradeLogService.setErrored.callCount).to.equal(0);

      indexStagedViews({ code: 'omg' });
      await Promise.resolve();
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
    });
  });

  describe('indexerProgress', () => {
    it('should call indexer progress', () => {
      sinon.stub(viewIndexerProgress, 'query');
      upgrade.indexerProgress();
      expect(viewIndexerProgress.query.callCount).to.equal(1);
    });

    it('should throw any indexer progress errors', async () => {
      sinon.stub(viewIndexerProgress, 'query').rejects({ omg: 'it fails' });
      try {
        await upgrade.indexerProgress();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ omg: 'it fails' });
        expect(viewIndexerProgress.query.callCount).to.equal(1);
      }
    });
  });

  describe('abort', () => {
    it('should abort the upgrade', async () => {
      sinon.stub(upgradeSteps, 'abort').resolves();

      await upgrade.abort();

      expect(upgradeSteps.abort.callCount).to.equal(1);
    });

    it('should throw error if abort fails', async () => {
      sinon.stub(upgradeSteps, 'abort').rejects({ an: 'error' });

      try {
        await upgrade.abort();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }
    });
  });

  describe('upgradeInProgress', () => {
    it('should return current upgrade log when upgrading', async () => {
      upgrade.__set__('upgrading', true);
      sinon.stub(upgradeLogService, 'get').resolves({ an: 'upgradeLog' });

      const result = await upgrade.upgradeInProgress();

      expect(result).to.deep.equal({ an: 'upgradeLog' });
      expect(upgrade.__get__('upgrading')).to.equal(true);
    });
  });

  describe('complete', () => {
    it('should call complete upgrade step', async () => {
      sinon.stub(upgradeSteps, 'complete').resolves('???');
      sinon.stub(upgradeSteps, 'finalize').resolves();
      const buildInfo = { version: 4 };

      expect(await upgrade.complete(buildInfo)).to.equal('???');

      expect(upgradeSteps.complete.callCount).to.equal(1);
      expect(upgradeSteps.complete.args[0]).to.deep.equal([buildInfo]);
      expect(upgradeSteps.finalize.callCount).to.equal(1);
    });

    it('should throw errors', async () => {
      sinon.stub(upgradeLogService, 'setErrored').resolves();
      sinon.stub(upgradeSteps, 'finalize');
      sinon.stub(upgradeSteps, 'complete').rejects({ status: 404 });
      const buildInfo = { version: 4 };

      await expect(upgrade.complete(buildInfo)).to.be.rejected.and.eventually.deep.equal({ status: 404 });
      expect(upgradeLogService.setErrored.callCount).to.equal(1);
      expect(upgradeSteps.finalize.callCount).to.equal(0);
    });
  });

  describe('canUpgrade', () => {
    it('should return true if docker upgrade service is running', async () => {
      sinon.stub(upgradeUtils, 'isDockerUpgradeServiceRunning').resolves(true);
      expect(await upgrade.canUpgrade()).to.equal(true);
    });

    it('should return false if docker upgrade service is running', async () => {
      sinon.stub(upgradeUtils, 'isDockerUpgradeServiceRunning').resolves(false);
      expect(await upgrade.canUpgrade()).to.equal(false);
    });
  });

  describe('compareBuildVersions', () => {
    let dbs;

    const ddoc = ({ id, views, nouveau }) => {
      const ddoc = {
        _id: `_design/${id}`,
      };
      if (views) {
        ddoc.views = views;
      }
      if (nouveau) {
        ddoc.nouveau = nouveau;
      }

      return ddoc;
    };

    const getDb = (dbName) => {
      let db = dbs.find(db => db.name === dbName);
      if (!db) {
        db = { name: dbName };
        dbs.push(db);
      }
      return db;
    };

    const buildMap = (dbName, ddocs) => {
      const db = getDb(dbName);
      const map = new Map();
      map.set(db, ddocs.map(ddoc));
      return map;
    };

    beforeEach(() => {
      dbs = [];
    });

    it('should report add when remote has a new ddoc', async () => {
      const local = buildMap('medic', [{ id: 'a' }]);
      const remote = buildMap('medic', [{ id: 'a' }, { id: 'b', views: { v1: {} } }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{ type: ['added'], indexing: true, ddoc: '_design/b', db: 'medic' }]);
    });

    it('should report nothing when local has a ddoc missing remotely', async () => {
      const local = buildMap('medic', [{ id: 'a' }, { id: 'b' }]);
      const remote = buildMap('medic', [{ id: 'a' }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should report nothing when a whole database is missing remotely', async () => {
      const localMedic = buildMap('medic', [{ id: 'a' }]);
      const localOther = buildMap('other-db', [{ id: 'b', views: { v1: {} } }]);
      const local = new Map([...localMedic, ...localOther]);

      const remote = buildMap('medic', [{ id: 'a' }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should report views when view map differs', async () => {
      const local = buildMap('medic', [{ id: 'a', views: { v1: { map: 'emit(doc._id)' } } }]);
      const remote = buildMap('medic', [{ id: 'a', views: { v1: { map: 'emit(doc.type)' } } }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report correct size when both views and indexes change', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(1)' } },
          nouveau: { idx1: { index: 'field1' } }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(2)' } },
          nouveau: { idx1: { index: 'field2' } }
        }]
      );

      upgradeUtils.getDdocInfo.resolves({ sizes: { file: 150 } });
      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 200 }, { disk_size: 300 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views', 'indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 650, // 150 (views) + 200 + 300 (indexes)
        indexing: true
      }]);
    });

    it('should report indexes when nouveau differs', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } } }]
      );
      const remote = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'field2', field_analyzers: { field1: 'std' } } } }]
      );

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report views when local has views and remote does not', async () => {
      const local = buildMap('medic', [{ id: 'a', views: { v1: { map: 'emit(doc._id)' } } }]);
      const remote = buildMap('medic', [{ id: 'a' }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report views when remote has views and local does not', async () => {
      const local = buildMap('medic', [{ id: 'a' }]);
      const remote = buildMap('medic', [{ id: 'a', views: { v1: { map: 'emit(doc._id)' } } }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report views when view count differs', async () => {
      const local = buildMap('medic', [{ id: 'a', views: { v1: { map: 'emit(doc._id)' } } }]);
      const remote = buildMap(
        'medic',
        [{ id: 'a', views: { v1: { map: 'emit(doc._id)' }, v2: { map: 'emit(1)' } } }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report indexes when local has indexes and remote does not', async () => {
      const local = buildMap('medic', [{ id: 'a', nouveau: { idx1: {} } }]);
      const remote = buildMap('medic', [{ id: 'a' }]);

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report indexes when remote has indexes and local does not', async () => {
      const local = buildMap('medic', [{ id: 'a' }]);
      const remote = buildMap('medic', [{ id: 'a', nouveau: { idx1: {} } }]);

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report indexes when index count differs', async () => {
      const local = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1' } } }]);
      const remote = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1' }, idx2: {} } }]);

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report indexes when field_analyzers differ in value', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }]
      );
      const remote = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'simple' } } } }]
      );

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report indexes when field_analyzers differ in length', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }]
      );
      const remote = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std', f2: 'std' } } } }]
      );

      upgradeUtils.getNouveauInfo.resolves([{ disk_size: 100 }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 100,
        indexing: true
      }]);
    });

    it('should report indexes when field_analyzers is missing in one ddoc', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }]
      );
      const remote = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1' } } }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should return empty when both ddocs have no views or indexes', async () => {
      const local = buildMap('medic', [{ id: 'a' }]);
      const remote = buildMap('medic', [{ id: 'a' }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should handle null field_analyzers', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: null } } }]
      );
      const remote = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: { f1: 'std' } } } }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report no changes when multiple views and indexes match perfectly', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          },
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' },
          }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          },
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' },
          }
        }]
      );
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should report views when one of multiple views differs', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(2)' },
          }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: {
            v1: { map: 'emit(1)' },
            v2: { map: 'emit(3)' },
          }
        }]
      );
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report indexes when one of multiple indexes differs', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f2' }
          }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          nouveau: {
            idx1: { index: 'f1' },
            idx2: { index: 'f3' },
          }
        }]
      );
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report indexes when default_analyzer differs', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', default_analyzer: 'std' } } }]
      );
      const remote = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', default_analyzer: 'simple' } } }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report indexes when default_analyzer is missing in one ddoc', async () => {
      const local = buildMap(
        'medic',
        [{ id: 'a', nouveau: { idx1: { index: 'f1', default_analyzer: 'std' } } }]
      );
      const remote = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1' } } }]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should handle undefined field_analyzers', async () => {
      const local = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: null } } }]);
      const remote = buildMap('medic', [{ id: 'a', nouveau: { idx1: { index: 'f1', field_analyzers: undefined } } }]);
      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);
      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should return empty when there are no differences', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(doc._id)' } },
          nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(doc._id)' } },
          nouveau: { idx1: { index: 'field1', field_analyzers: { field1: 'std' } } }
        }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([]);
    });

    it('should handle multiple databases and include db name in results', async () => {
      const localMedic = buildMap(
        'medic',
        [{ id: 'a' }]
      );
      const localMedicLogs = buildMap(
        'medic-logs',
        [{ id: 'x', views: { v1: { map: 'emit(doc._id)' } } }]
      );
      const local = new Map([...localMedicLogs, ...localMedic]);

      const remoteMedic = buildMap(
        'medic',
        [{ id: 'a' }, { id: 'b', views: { v1: {} } }]
      );
      const remoteMedicLogs = buildMap(
        'medic-logs',
        [{ id: 'x', views: { v1: { map: 'emit(doc.type)' } } }]
      );
      const remote = new Map([...remoteMedicLogs, ...remoteMedic]);

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.have.deep.members([
        { type: ['added'], ddoc: '_design/b', db: 'medic', indexing: true },
        { type: ['views'], ddoc: '_design/x', db: 'medic-logs', indexing: true, size: 0, },
      ]);
      expect(result).to.have.length(2);
    });

    it('should report both views and indexes when both differ in the same ddoc', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(1)' } },
          nouveau: { idx1: { index: 'f1' } }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(2)' } },
          nouveau: { idx1: { index: 'f2' } }
        }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views', 'indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report views when only views differ in a ddoc that also has nouveau indexes', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(1)' } },
          nouveau: { idx1: { index: 'f1' } }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(2)' } },
          nouveau: { idx1: { index: 'f1' } }
        }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['views'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

    it('should report indexes when only nouveau indexes differ in a ddoc that also has views', async () => {
      const local = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(1)' } },
          nouveau: { idx1: { index: 'f1' } }
        }]
      );
      const remote = buildMap(
        'medic',
        [{
          id: 'a',
          views: { v1: { map: 'emit(1)' } },
          nouveau: { idx1: { index: 'f2' } }
        }]
      );

      sinon.stub(upgradeUtils, 'getLocalDdocDefinitions').resolves(local);
      sinon.stub(upgradeUtils, 'downloadDdocDefinitions').resolves(remote);

      const result = await upgrade.compareBuildVersions({});
      expect(result).to.deep.equal([{
        type: ['indexes'],
        ddoc: '_design/a',
        db: 'medic',
        size: 0,
        indexing: true
      }]);
    });

  });
});
