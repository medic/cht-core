const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const upgradeLogService = require('../../../../src/services/setup/upgrade-log');
const upgradeSteps = require('../../../../src/services/setup/upgrade-steps');
const viewIndexerProgress = require('../../../../src/services/setup/view-indexer-progress');

let upgrade;

describe('upgrade service', () => {
  beforeEach(() => {
    upgrade = rewire('../../../../src/services/setup/upgrade');
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('upgrade', () => {
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
});
