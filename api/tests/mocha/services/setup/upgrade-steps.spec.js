const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const upgradeUtils = require('../../../../src/services/setup/utils');
const viewIndexerProgress = require('../../../../src/services/setup/view-indexer-progress');
const viewIndexer = require('../../../../src/services/setup/view-indexer');

let upgradeSteps;

const buildInfo = (version, namespace='medic', application='medic') => ({ version, namespace, application });

describe('Upgrade steps', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    upgradeSteps = rewire('../../../../src/services/setup/upgrade-steps');
  });

  describe('finalize', () => {
    it('should overwrite ddocs and cleanup', async () => {
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeLogService, 'setFinalizing');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs');
      sinon.stub(upgradeUtils, 'deleteStagedDdocs');
      sinon.stub(upgradeLogService, 'setFinalized');
      sinon.stub(upgradeUtils, 'cleanup');

      await upgradeSteps.finalize();

      expect(upgradeLogService.setComplete.callCount).to.equal(1);
      expect(upgradeLogService.setFinalizing.callCount).to.equal(1);
      expect(upgradeUtils.unstageStagedDdocs.callCount).to.equal(1);
      expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
      expect(upgradeLogService.setFinalized.callCount).to.equal(1);
      expect(upgradeUtils.cleanup.callCount).to.equal(1);
    });

    it('should throw an error if unstage fails', async () => {
      sinon.stub(upgradeLogService, 'setFinalizing');
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs').rejects({ reason: 'omg' });

      try {
        await upgradeSteps.finalize();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ reason: 'omg' });
        expect(upgradeLogService.setComplete.callCount).to.equal(1);
        expect(upgradeLogService.setFinalizing.callCount).to.equal(1);
        expect(upgradeUtils.unstageStagedDdocs.callCount).to.equal(1);
      }
    });

    it('should throw an error if deleting staged ddocs fails', async () => {
      sinon.stub(upgradeLogService, 'setFinalizing');
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs');
      sinon.stub(upgradeUtils, 'deleteStagedDdocs').rejects({ error: 'thing' });

      try {
        await upgradeSteps.finalize();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'thing' });
        expect(upgradeLogService.setFinalizing.callCount).to.equal(1);
        expect(upgradeUtils.unstageStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
      }
    });

    it('should throw an error if cleanup fails', async () => {
      sinon.stub(upgradeLogService, 'setComplete');
      sinon.stub(upgradeLogService, 'setFinalizing');
      sinon.stub(upgradeUtils, 'unstageStagedDdocs');
      sinon.stub(upgradeUtils, 'deleteStagedDdocs');
      sinon.stub(upgradeLogService, 'setFinalized');
      sinon.stub(upgradeUtils, 'cleanup').rejects({ an: 'error'});

      try {
        await upgradeSteps.finalize();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error'});
      }
    });
  });

  describe('abort', () => {
    it('should delete staged ddocs, delete upgrade folder and cleanup', async () => {
      sinon.stub(upgradeUtils, 'deleteStagedDdocs');
      sinon.stub(upgradeLogService, 'setAborted');
      sinon.stub(upgradeLogService, 'setAborting');
      sinon.stub(viewIndexer, 'stopIndexing');
      sinon.stub(upgradeUtils, 'cleanup');

      await upgradeSteps.abort();

      expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
      expect(upgradeLogService.setAborting.callCount).to.equal(1);
      expect(upgradeLogService.setAborted.callCount).to.equal(1);
      expect(upgradeUtils.cleanup.callCount).to.equal(1);
      expect(viewIndexer.stopIndexing.callCount).to.equal(1);
    });

    it('should throw error if staged deletion fails', async () => {
      sinon.stub(upgradeUtils, 'deleteStagedDdocs').rejects({ code: 500 });
      sinon.stub(upgradeLogService, 'setAborting');
      sinon.stub(upgradeLogService, 'setAborted');
      sinon.stub(upgradeUtils, 'cleanup');
      sinon.stub(viewIndexer, 'stopIndexing');

      try {
        await upgradeSteps.abort();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ code: 500 });
        expect(viewIndexer.stopIndexing.callCount).to.equal(1);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeLogService.setAborting.callCount).to.equal(1);
        expect(upgradeUtils.cleanup.callCount).to.equal(0);
        expect(upgradeLogService.setAborted.callCount).to.equal(0);
      }
    });

    it('should throw error if changing upgrade log state fails', async () => {
      sinon.stub(upgradeUtils, 'deleteStagedDdocs');
      sinon.stub(upgradeLogService, 'setAborting').rejects({ error: 'gone' });
      sinon.stub(upgradeLogService, 'setAborted');
      sinon.stub(viewIndexer, 'stopIndexing');

      try {
        await upgradeSteps.abort();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'gone' });
        expect(viewIndexer.stopIndexing.callCount).to.equal(0);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(0);
        expect(upgradeLogService.setAborted.callCount).to.equal(0);
      }
    });

    it('should throw error if cleanup fails', async () => {
      sinon.stub(upgradeUtils, 'deleteStagedDdocs');
      sinon.stub(upgradeLogService, 'setAborted');
      sinon.stub(upgradeLogService, 'setAborting');
      sinon.stub(viewIndexer, 'stopIndexing');
      sinon.stub(upgradeUtils, 'cleanup').rejects({ error: 'boom' });

      try {
        await upgradeSteps.abort();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'boom' });
      }
    });
  });

  describe('prep', () => {
    it('should throw an error when build info is not defined correctly', async () => {
      try {
        await upgradeSteps.prep(['not a build info']);
      } catch (err) {
        expect(err.message).to.match(/Invalid build info/);
      }
    });

    describe('on upgrade', () => {
      it('should abort previous upgrade, create log when staging', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves(buildInfo('4.0.0'));
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'abortPreviousUpgrade');
        sinon.stub(upgradeUtils, 'freshInstall').resolves(false);

        await upgradeSteps.prep(buildInfo('4.0.1'), 'martin', true);

        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal([
          'stage',
          buildInfo('4.0.1'),
          buildInfo('4.0.0'),
          'martin',
        ]);
        expect(upgradeUtils.abortPreviousUpgrade.callCount).to.equal(1);
      });

      it('should abort previous upgrade, create log', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves(buildInfo('4.0.1'));
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'abortPreviousUpgrade');
        sinon.stub(upgradeUtils, 'freshInstall').resolves(false);

        await upgradeSteps.prep(buildInfo('4.0.2'), 'jack', false);

        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal([
          'upgrade',
          buildInfo('4.0.2'),
          buildInfo('4.0.1'),
          'jack',
        ]);
        expect(upgradeUtils.abortPreviousUpgrade.callCount).to.equal(1);
      });
    });

    describe('on fresh install', () => {
      it('should create upgrade folder and create upgrade log', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves(buildInfo('4.0.0'));
        sinon.stub(upgradeUtils, 'freshInstall').resolves(true);
        sinon.stub(upgradeUtils, 'abortPreviousUpgrade');
        sinon.stub(upgradeLogService, 'create');

        await upgradeSteps.prep();

        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.getPackagedBuildInfo.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(1);
        expect(upgradeLogService.create.args[0]).to.deep.equal(['install', buildInfo('4.0.0')]);
        expect(upgradeUtils.abortPreviousUpgrade.callCount).to.equal(1);
      });
    });

    describe('on update install', () => {
      it('should do nothing', async () => {
        sinon.stub(upgradeUtils, 'freshInstall').resolves(false);
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo');
        sinon.stub(upgradeLogService, 'create');
        sinon.stub(upgradeUtils, 'abortPreviousUpgrade');

        await upgradeSteps.prep();

        expect(upgradeUtils.freshInstall.callCount).to.equal(1);
        expect(upgradeUtils.getPackagedBuildInfo.callCount).to.equal(1);
        expect(upgradeLogService.create.callCount).to.equal(0);
        expect(upgradeUtils.abortPreviousUpgrade.callCount).to.equal(0);
      });
    });
  });

  describe('stage', () => {
    it('should throw an error when version is not defined correctly', async () => {
      try {
        await upgradeSteps.stage(['not a version']);
      } catch (err) {
        expect(err.message).to.equal('Invalid build info');
      }
    });

    describe('on upgrade', () => {
      it('get ddoc definitions, stage new ddocs', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves('4.0.0');
        sinon.stub(upgradeUtils, 'getDdocDefinitions').resolves('ddoc list');
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        await upgradeSteps.stage(buildInfo('4.0.1'), 'martin');

        expect(upgradeUtils.getDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.getDdocDefinitions.args[0]).to.deep.equal([buildInfo('4.0.1')]);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['ddoc list']);
        expect(upgradeLogService.setStaged.callCount).to.equal(1);
      });

      it('should throw an error when staging ddoc for version is not found', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves('4.0.1');
        sinon.stub(upgradeUtils, 'getDdocDefinitions').rejects({ some: 'error' });
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await upgradeSteps.stage(buildInfo('4.0.2'), 'john');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ some: 'error' });
        }

        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.getDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.getDdocDefinitions.args[0]).to.deep.equal([buildInfo('4.0.2')]);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(0);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });

      it('should throw an error if staging fails', async () => {
        sinon.stub(upgradeUtils, 'getPackagedBuildInfo').resolves('4.1.0');
        sinon.stub(upgradeUtils, 'getDdocDefinitions').resolves(['the', 'ddoc', 'list']);
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs').rejects({ error: true });
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await upgradeSteps.stage(buildInfo('4.2.0'), 'carl');
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: true });
        }

        expect(upgradeUtils.getDdocDefinitions.callCount).to.equal(1);
        expect(upgradeUtils.getDdocDefinitions.args[0]).to.deep.equal([buildInfo('4.2.0')]);
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal([['the', 'ddoc', 'list']]);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });
    });

    describe('on install', () => {
      it('stage packaged ddocs', async () => {
        sinon.stub(upgradeUtils, 'getDdocDefinitions').resolves({ db1: ['ddocs'], db2: ['ddocs'] });
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs');
        sinon.stub(upgradeLogService, 'setStaged');

        await upgradeSteps.stage();
        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal([{ db1: ['ddocs'], db2: ['ddocs'] }]);
        expect(upgradeLogService.setStaged.callCount).to.equal(1);
      });

      it('should throw an error if staging fails', async () => {
        sinon.stub(upgradeUtils, 'deleteStagedDdocs');
        sinon.stub(upgradeUtils, 'getDdocDefinitions').resolves('ddocs');
        sinon.stub(upgradeUtils, 'saveStagedDdocs').rejects({ error: 'boom' });
        sinon.stub(upgradeLogService, 'setStaged');

        try {
          await upgradeSteps.stage(buildInfo('4.1.0'));
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.deep.equal({ error: 'boom' });
        }

        expect(upgradeUtils.deleteStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.callCount).to.equal(1);
        expect(upgradeUtils.saveStagedDdocs.args[0]).to.deep.equal(['ddocs']);
        expect(upgradeLogService.setStaged.callCount).to.equal(0);
      });
    });
  });

  describe('indexStagedViews', () => {
    it('should get views to index, start indexing and log indexing progress', async () => {
      sinon.stub(viewIndexer, 'getViewsToIndex').resolves(['views', 'to', 'index']);
      let doneIndexingViews;
      sinon.stub(viewIndexer, 'indexViews').returns(new Promise(r => doneIndexingViews = r));
      const stopViewIndexerProgress = sinon.stub();
      sinon.stub(viewIndexerProgress, 'log').returns(stopViewIndexerProgress);

      const indexStagedViewsPromise = upgradeSteps.indexStagedViews();

      expect(viewIndexer.getViewsToIndex.callCount).to.equal(1);
      expect(viewIndexer.indexViews.callCount).to.equal(0);
      await Promise.resolve();
      expect(viewIndexer.indexViews.callCount).to.equal(1);
      expect(viewIndexer.indexViews.args[0]).to.deep.equal([['views', 'to', 'index']]);
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
      sinon.stub(viewIndexer, 'getViewsToIndex').rejects({ an: 'error' });

      try {
        await upgradeSteps.indexStagedViews();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ an: 'error' });
      }

      expect(viewIndexer.getViewsToIndex.callCount).to.equal(1);
    });
  });

  describe('complete', () => {
    it('should get staging doc, prep payload and make upgrade request', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'getStagingDoc').resolves({ the: 'staging_doc' });
      sinon.stub(upgradeUtils, 'getUpgradeServicePayload').returns({ the: 'payload' });
      sinon.stub(upgradeUtils, 'makeUpgradeRequest').resolves('response');

      const buildInfo = { version: '4.0.0' };

      expect(await upgradeSteps.complete({ ...buildInfo })).to.equal('response');

      expect(upgradeLogService.setCompleting.callCount).to.equal(1);
      expect(upgradeUtils.getStagingDoc.callCount).to.deep.equal(1);
      expect(upgradeUtils.getStagingDoc.args[0]).to.deep.equal([buildInfo]);
      expect(upgradeUtils.getUpgradeServicePayload.callCount).to.equal(1);
      expect(upgradeUtils.getUpgradeServicePayload.args[0]).to.deep.equal([{ the: 'staging_doc' }]);
      expect(upgradeUtils.makeUpgradeRequest.callCount).to.equal(1);
      expect(upgradeUtils.makeUpgradeRequest.args[0]).to.deep.equal([{ the: 'payload' }]);
    });

    it('should throw missing staging doc errors', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'getStagingDoc').rejects({ status: 404 });

      const buildInfo = { version: '4.0.0' };

      await expect(upgradeSteps.complete(buildInfo)).to.be.rejected.and.eventually.deep.equal({ status: 404 });
    });

    it('should throw getUpgradeServicePayload errors', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'getStagingDoc').resolves({ the: 'staging_doc' });
      sinon.stub(upgradeUtils, 'getUpgradeServicePayload').throws(new Error('some type error'));

      const buildInfo = { version: '4.0.0' };
      await expect(upgradeSteps.complete(buildInfo)).to.be.rejectedWith('some type error');
      expect(upgradeLogService.setCompleting.callCount).to.equal(1);
      expect(upgradeUtils.getStagingDoc.callCount).to.deep.equal(1);
    });

    it('should throw makeUpgradeRequest errors', async () => {
      sinon.stub(upgradeLogService, 'setCompleting');
      sinon.stub(upgradeUtils, 'getStagingDoc').resolves({ the: 'staging_doc' });
      sinon.stub(upgradeUtils, 'getUpgradeServicePayload').returns({ the: 'payload' });
      sinon.stub(upgradeUtils, 'makeUpgradeRequest').rejects({ error: 'boom' });

      const buildInfo = { version: '4.0.0' };

      await expect(upgradeSteps.complete(buildInfo)).to.be.rejected.and.eventually.deep.equal({ error: 'boom' });
    });
  });
});
