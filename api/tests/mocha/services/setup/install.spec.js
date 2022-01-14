const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const upgradeUtils = require('../../../../src/services/setup/utils');
const viewIndexerProgress = require('../../../../src/services/setup/indexer-progress');

let install;
'use strict';

describe('Install service', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    install = rewire('../../../../src/services/setup/install');
  });

  describe('complete', () => {
    it('should overwrite ddocs and cleanup', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs');
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeUtils, 'cleanup');

      await install.complete();

      expect(upgradeLogService.setCompleting.callCount).to.equal(1);
      expect(upgradeUtils.unstageStagedDdocs.callCount).to.equal(1);
      expect(upgradeLogService.setCompleting.callCount).to.equal(1);
      expect(upgradeUtils.cleanup.callCount).to.equal(1);
    });

    it('should throw an error if unstage fails', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs').rejects({ reason: 'omg' });

      try {
        await install.complete();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ reason: 'omg' });
        expect(upgradeLogService.setCompleting.callCount).to.equal(1);
        expect(upgradeUtils.unstageStagedDdocs.callCount).to.equal(1);
      }
    });

    it('should throw an error if cleanup fails', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs');
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeUtils, 'cleanup').rejects({ an: 'error'});

      try {
        await install.complete();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error'});
      }
    });
  });

  describe('stage', () => {
    it('should throw an error when version is not defined correctly', async () => {
      try {
        await install.stage(['not a version']);
      } catch (err) {
        expect(err.message).to.equal('Invalid version: not a version');
      }
    });

    describe('on upgrade', () => {
      it('should create upgrade folder, get ddoc definitions, stage new ddocs', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.0.0');
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'downloadDdocDefinitions');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        await install.stage('4.0.1', 'martin');

        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['4.0.1', '4.0.0', 'martin']);
        expect(upgradeUtils.downloadDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.downloadDdocDefinitions.args[0]).to.deep.equal(['4.0.1']);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['4.0.1']);
        expect(upgradeLogService.setStaged.callCount).to.equal(1);
      });

      it('should throw an error when upgrade folder creation fails', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.0.0');
        sinon.stub(upgradeUtils, 'createUpgradeFolder').rejects({ code: 100 });
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'downloadDdocDefinitions');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage('4.0.1', 'martin');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ code: 100 });
        }

        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(0);
        expect(upgradeUtils.downloadDdocDefinitions.callCount).to.equal(0);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(0);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(0);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });

      it('should throw an error when staging ddoc for version is not found', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.0.1');
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'downloadDdocDefinitions').rejects({ some: 'error' });
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage('4.0.2', 'john');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ some: 'error' });
        }

        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['4.0.2', '4.0.1', 'john']);
        expect(upgradeUtils.downloadDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.downloadDdocDefinitions.args[0]).to.deep.equal(['4.0.2']);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(0);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(0);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });

      it('should throw an error if staging fails', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.1.0');
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'downloadDdocDefinitions');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs').rejects({ error: true });
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage('4.2.0', 'carl');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: true });
        }

        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['4.2.0', '4.1.0', 'carl']);
        expect(upgradeUtils.downloadDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.downloadDdocDefinitions.args[0]).to.deep.equal(['4.2.0']);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['4.2.0']);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });
    });

    describe('on fresh install', () => {
      it('should create upgrade folder, stage packaged ddocs', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.0.0');
        sinon.stub(upgradeUtils, 'freshInstall').resolves(true);
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        await install.stage();

        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.getPackagedVersion.callCount).to.equal(1);
        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['4.0.0']);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['local']);
        expect(upgradeLogService.setStaged.callCount).to.equal(1);
      });

      it('should throw an error when upgrade folder creation fails', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.1.0');
        sinon.stub(upgradeUtils, 'freshInstall').resolves(true);
        sinon.stub(upgradeUtils, 'createUpgradeFolder').rejects({ the: 'error' });
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ the: 'error' });
        }

        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(0);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(0);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(0);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });

      it('should throw an error if staging fails', async () => {
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.1.0');
        sinon.stub(upgradeUtils, 'freshInstall').resolves(true);
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs').rejects({ error: 'boom' });
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage('4.1.0');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: 'boom' });
        }

        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['4.1.0']);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['4.1.0']);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });
    });

    describe('on update install', () => {
      it('should stage packaged ddocs', async () => {
        sinon.stub(upgradeUtils, 'freshInstall').resolves(false);
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.2.0');
        sinon.stub(upgradeUtils, 'createUpgradeFolder');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        await install.stage();

        expect(upgradeUtils.getPackagedVersion.callCount).to.equal(1);
        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.createUpgradeFolder.callCount).to.equal(0);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['local']);
        expect(upgradeLogService.setStaged.callCount).to.equal(1);
      });

      it('should throw an error if staging fails', async () => {
        sinon.stub(upgradeUtils, 'freshInstall').resolves(false);
        sinon.stub(upgradeUtils, 'getPackagedVersion').resolves('4.2.0');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs').rejects({ error: 'omg' });
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await install.stage();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: 'omg' });
        }

        expect(upgradeUtils.getPackagedVersion.callCount).to.equal(1);
        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['local']);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });
    });
  });

  describe('indexStagedViews', () => {
    it('should get views to index, start indexing and log indexing progress', async () => {
      sinon.stub(upgradeUtils, 'getViewsToIndex').resolves(['views', 'to', 'index']);
      let doneIndexingViews;
      sinon.stub(upgradeUtils, 'indexViews').returns(new Promise(r => doneIndexingViews = r));
      const stopViewIndexerProgress = sinon.stub();
      sinon.stub(viewIndexerProgress, 'log').returns(stopViewIndexerProgress);

      const indexStagedViewsPromise = install.indexStagedViews();

      expect(upgradeUtils.getViewsToIndex.callCount).to.equal(1);
      expect(upgradeUtils.indexViews.callCount).to.equal(0);
      await Promise.resolve();
      expect(upgradeUtils.indexViews.callCount).to.equal(1);
      expect(upgradeUtils.indexViews.args[0]).to.deep.equal([['views', 'to', 'index']]);
      expect(viewIndexerProgress.log.callCount).to.equal(1);
      expect(stopViewIndexerProgress.callCount).to.equal(0);

      await Promise.resolve();
      expect(stopViewIndexerProgress.callCount).to.equal(0);
      await Promise.resolve();
      expect(stopViewIndexerProgress.callCount).to.equal(0);
      await Promise.resolve();
      expect(stopViewIndexerProgress.callCount).to.equal(0);

      doneIndexingViews();
      await Promise.resolve();
      expect(stopViewIndexerProgress.callCount).to.equal(1);

      await indexStagedViewsPromise;
    });

    it('should throw an error if starting view indexing throws an error', async () => {
      sinon.stub(upgradeUtils, 'getViewsToIndex').rejects({ an: 'error' });

      try {
        await install.indexStagedViews();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }

      expect(upgradeUtils.getViewsToIndex.callCount).to.equal(1);
    });
  });

  describe('checkInstallForDb', () => {
    it('should be valid when there are no missing or different ddocs', async () => {
      const ddocs = [
        { _id: '_design/one' },
        { _id: '_design/two' },
        { _id: '_design/three' },
      ];
      Object.freeze(ddocs);
      sinon.stub(upgradeUtils, 'getDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'isStagedDdoc').returns(false);
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'compareDdocs').returns({ missing: [], different: [] });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await install.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({ valid: true, missing: [], different: [] });

      expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getDdocs.args[0]).to.deep.equal([db]);
      expect(upgradeUtils.isStagedDdoc.callCount).to.equal(6);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(upgradeUtils.compareDdocs.callCount).to.equal(1);
      expect(upgradeUtils.compareDdocs.args[0]).to.deep.equal([ddocs, ddocs]);
    });

    it('should be staged when all ddocs are staged', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/three', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:two', v: 2 },
        { _id: '_design/:staged:three', v: 2 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(upgradeUtils, 'getDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'isStagedDdoc').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(upgradeUtils, 'compareDdocs');
      upgradeUtils.compareDdocs.onCall(0).returns({
        missing: [],
        different: ['_design/one', '_design/two', '_design/three'],
      });
      upgradeUtils.compareDdocs.onCall(1).returns({ missing: [], different: [],});
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await install.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: true,
        partialStagedUpgrade: true,
        missing: [],
        different: ['_design/one', '_design/two', '_design/three'],
      });
      expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getDdocs.args[0]).to.deep.equal([db]);
      expect(upgradeUtils.isStagedDdoc.callCount).to.equal(12);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(upgradeUtils.compareDdocs.callCount).to.equal(2);
      expect(upgradeUtils.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
          { _id: '_design/three', v: 1 },
        ],
      ]);
      expect(upgradeUtils.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:two', v: 2 },
          { _id: '_design/:staged:three', v: 2 },
        ],
      ]);
    });

    it('should be partially staged when some ddocs are staged', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:three', v: 2 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(upgradeUtils, 'getDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'isStagedDdoc').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(upgradeUtils, 'compareDdocs');
      upgradeUtils.compareDdocs.onCall(0).returns({
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      upgradeUtils.compareDdocs.onCall(1).returns({
        missing: ['_design/two'],
        different: [],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await install.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: true,
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getDdocs.args[0]).to.deep.equal([db]);
      expect(upgradeUtils.isStagedDdoc.callCount).to.equal(8);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(upgradeUtils.compareDdocs.callCount).to.equal(2);
      expect(upgradeUtils.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(upgradeUtils.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:three', v: 2 },
        ],
      ]);
    });

    it('should be empty when at least one staged ddoc is different', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
        { _id: '_design/:staged:one', v: 2 },
        { _id: '_design/:staged:three', v: 1 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
        { _id: '_design/three', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(upgradeUtils, 'getDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'isStagedDdoc').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(upgradeUtils, 'compareDdocs');
      upgradeUtils.compareDdocs.onCall(0).returns({
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      upgradeUtils.compareDdocs.onCall(1).returns({
        missing: ['_design/two'],
        different: ['_design/three'],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await install.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: false,
        missing: ['_design/three'],
        different: ['_design/one', '_design/two'],
      });
      expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getDdocs.args[0]).to.deep.equal([db]);
      expect(upgradeUtils.isStagedDdoc.callCount).to.equal(8);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(upgradeUtils.compareDdocs.callCount).to.equal(2);
      expect(upgradeUtils.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(upgradeUtils.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [
          { _id: '_design/:staged:one', v: 2 },
          { _id: '_design/:staged:three', v: 1 },
        ],
      ]);
    });

    it('should be empty when there are no staged ddocs', async () => {
      const ddocs = [
        { _id: '_design/one', v: 1 },
        { _id: '_design/two', v: 1 },
      ];
      Object.freeze(ddocs);

      const bundled = [
        { _id: '_design/one', v: 2 },
        { _id: '_design/two', v: 2 },
      ];
      Object.freeze(bundled);

      sinon.stub(upgradeUtils, 'getDdocs').resolves(ddocs);
      sinon.stub(upgradeUtils, 'isStagedDdoc').callsFake(id => id.includes('staged'));
      sinon.stub(upgradeUtils, 'getBundledDdocs').resolves(bundled);
      sinon.stub(upgradeUtils, 'compareDdocs');
      upgradeUtils.compareDdocs.onCall(0).returns({
        missing: [],
        different: ['_design/one', '_design/two'],
      });
      upgradeUtils.compareDdocs.onCall(1).returns({
        missing: ['_design/two', '_design/one'],
        different: [],
      });
      const db = { data: 'base' };
      Object.freeze(db);

      const result = await install.__get__('checkInstallForDb')(db);

      expect(result).to.deep.equal({
        stagedUpgrade: false,
        partialStagedUpgrade: false,
        missing: [],
        different: ['_design/one', '_design/two'],
      });
      expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getDdocs.args[0]).to.deep.equal([db]);
      expect(upgradeUtils.isStagedDdoc.callCount).to.equal(4);
      expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      expect(upgradeUtils.getBundledDdocs.args[0]).to.deep.equal([db]);

      expect(upgradeUtils.compareDdocs.callCount).to.equal(2);
      expect(upgradeUtils.compareDdocs.args[0]).to.deep.equal([
        bundled,
        [
          { _id: '_design/one', v: 1 },
          { _id: '_design/two', v: 1 },
        ],
      ]);
      expect(upgradeUtils.compareDdocs.args[1]).to.deep.equal([
        bundled,
        [],
      ]);
    });

    it('should throw an error when getting ddocs throws an error', async () => {
      sinon.stub(upgradeUtils, 'getDdocs').rejects({ the: 'error' });

      try {
        await install.__get__('checkInstallForDb')('db');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ the: 'error' });
        expect(upgradeUtils.getDdocs.callCount).to.equal(1);
      }
    });

    it('should throw an error when getting bundled ddocs throws an error', async () => {
      sinon.stub(upgradeUtils, 'getDdocs').resolves([{ _id: 'ddoc' }]);
      sinon.stub(upgradeUtils, 'getBundledDdocs').rejects({ error: 'boom' });

      try {
        await install.__get__('checkInstallForDb')('db');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'boom' });
        expect(upgradeUtils.getDdocs.callCount).to.equal(1);
        expect(upgradeUtils.getBundledDdocs.callCount).to.equal(1);
      }
    });
  });

  describe('checkInstall', () => {
    it('should do nothing if install is valid', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ valid: true });
      install.__set__('checkInstallForDb', checkInstallForDb);

      await install.checkInstall();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);
    });

    it('should complete install if some dbs are staged and some are valid', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ valid: true });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ valid: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const complete = sinon.stub();
      install.__set__('complete', complete);

      await install.checkInstall();

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);
      expect(complete.callCount).to.equal(1);
    });

    it('should complete install if all dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const complete = sinon.stub().resolves();
      install.__set__('complete', complete);

      await install.checkInstall();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);
      expect(complete.callCount).to.equal(1);
    });

    it('should stage installation, index views and complete install if only some dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ stagedUpgrade: false });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: true, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      install.__set__('checkInstallForDb', checkInstallForDb);

      let stageResolve;
      const stage = sinon.stub().returns(new Promise(r => stageResolve = r));
      install.__set__('stage', stage);

      let indexViewsResolve;
      const indexViews = sinon.stub().returns(new Promise(r => indexViewsResolve = r));
      install.__set__('indexStagedViews', indexViews);

      const complete = sinon.stub().resolves();
      install.__set__('complete', complete);

      const checkInstall = install.checkInstall();

      // resolve checking every database
      await Promise.resolve();
      await Promise.all(dbs.map(() => Promise.resolve()));

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);

      expect(stage.callCount).to.equal(0);
      expect(indexViews.callCount).to.equal(0);
      expect(complete.callCount).to.equal(0);

      await Promise.resolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(0);
      expect(complete.callCount).to.equal(0);

      await stageResolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(1);
      expect(complete.callCount).to.equal(0);

      await indexViewsResolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(1);
      expect(complete.callCount).to.equal(1);

      await checkInstall;
    });

    it('should stage installation, index views and complete install if some dbs are partially staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' }, { name: 'four' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub();
      checkInstallForDb.onCall(0).resolves({ valid: true });
      checkInstallForDb.onCall(1).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(2).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      checkInstallForDb.onCall(3).resolves({ stagedUpgrade: false, partialStagedUpgrade: true });
      install.__set__('checkInstallForDb', checkInstallForDb);

      let stageResolve;
      const stage = sinon.stub().returns(new Promise(r => stageResolve = r));
      install.__set__('stage', stage);

      let indexViewsResolve;
      const indexViews = sinon.stub().returns(new Promise(r => indexViewsResolve = r));
      install.__set__('indexStagedViews', indexViews);

      const complete = sinon.stub().resolves();
      install.__set__('complete', complete);

      const checkInstall = install.checkInstall();

      // resolve checking every database
      await Promise.resolve();
      await Promise.all(dbs.map(() => Promise.resolve()));

      expect(checkInstallForDb.callCount).to.equal(4);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]], [dbs[3]] ]);

      expect(stage.callCount).to.equal(0);
      expect(indexViews.callCount).to.equal(0);
      expect(complete.callCount).to.equal(0);

      await Promise.resolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(0);
      expect(complete.callCount).to.equal(0);

      await stageResolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(1);
      expect(complete.callCount).to.equal(0);

      await indexViewsResolve();

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(1);
      expect(complete.callCount).to.equal(1);

      await checkInstall;
    });


    it('should stage installation, index views and complete install if none of the dbs are staged', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const stage = sinon.stub().resolves();
      install.__set__('stage', stage);
      const indexViews = sinon.stub().resolves();
      install.__set__('indexStagedViews', indexViews);
      const complete = sinon.stub().resolves();
      install.__set__('complete', complete);

      await install.checkInstall();

      expect(checkInstallForDb.callCount).to.equal(3);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]], [dbs[2]] ]);

      expect(stage.callCount).to.equal(1);
      expect(indexViews.callCount).to.equal(1);
      expect(complete.callCount).to.equal(1);
    });

    it('should throw an error when checking install fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      checkInstallForDb.onCall(1).rejects({ an: 'error' });
      install.__set__('checkInstallForDb', checkInstallForDb);

      try {
        await install.checkInstall();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }

      expect(checkInstallForDb.callCount).to.equal(2);
      expect(checkInstallForDb.args).to.deep.equal([ [dbs[0]], [dbs[1]] ]);
    });

    it('should throw an error when staging fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const stage = sinon.stub().rejects({ boom: true });
      install.__set__('stage', stage);

      try {
        await install.checkInstall();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ boom: true });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(stage.callCount).to.equal(1);
      }
    });

    it('should throw an error when indexing fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two'}, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const stage = sinon.stub().resolves();
      install.__set__('stage', stage);
      const indexViews = sinon.stub().rejects({ code: 500 });
      install.__set__('indexStagedViews', indexViews);

      try {
        await install.checkInstall();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 500 });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(stage.callCount).to.equal(1);
        expect(indexViews.callCount).to.equal(1);
      }
    });

    it('should throw an error when completing install fails', async () => {
      const dbs = [{ name: 'one'}, { name: 'two' }, { name: 'three' } ];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      const checkInstallForDb = sinon.stub().resolves({ stagedUpgrade: false, partialStagedUpgrade: false });
      install.__set__('checkInstallForDb', checkInstallForDb);

      const stage = sinon.stub().resolves();
      install.__set__('stage', stage);
      const indexViews = sinon.stub().resolves();
      install.__set__('indexStagedViews', indexViews);
      const complete = sinon.stub().rejects({ status: 503 });
      install.__set__('complete', complete);

      try {
        await install.checkInstall();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ status: 503 });
        expect(checkInstallForDb.callCount).to.equal(3);
        expect(stage.callCount).to.equal(1);
        expect(indexViews.callCount).to.equal(1);
        expect(complete.callCount).to.equal(1);
      }
    });
  });

  describe('logDdocCheck', () => {
    it('should not crash if ddoc checks are empty', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      install.__get__('logDdocCheck')({ });
    });

    it('should not crash if ddoc checks are malformed', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      install.__get__('logDdocCheck')({ one: [] });
      install.__get__('logDdocCheck')({ one: {}, two: 200, three: 'thing' });
      install.__get__('logDdocCheck')({ one: { missing: 'omg', different: 100 } });
    });

    it('should not crash if ddoc checks are correct', () => {
      const dbs = [{ name: 'one' }, { name: 'two' }, { name: 'three' }];
      Object.freeze(dbs);
      sinon.stub(upgradeUtils, 'DATABASES').value(dbs);

      install.__get__('logDdocCheck')({
        one: {
          different: ['a', 'b', 'c'],
          missing: [],
        },
        two: {
          different: [],
          missing: ['c', 'd', 'e'],
        }
      });

    });
  });
});

